import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createProduct, createVariant, updateProduct } from "@/modules/catalog/application/product-management";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let categoryId: string;
let warehouseId: string;
const created = { accountIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

beforeEach(async () => {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-clothing-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITCLO-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Clothing",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(staffRecord.id);
  categoryId = category.id;
  warehouseId = warehouse.id;

  staff = {
    id: staffRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: staffRecord.email,
    phone: staffRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: staffRecord.createdAt,
    updatedAt: staffRecord.updatedAt,
    employeeProfile: { id: staffRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("adding a clothing product with its sizes, colours and stock", () => {
  it("creates one variant per size/colour with its own price and opening stock", async () => {
    const product = await createProduct(staff, {
      name: `ترنج اولادي ${Date.now().toString(36)}`,
      basePrice: "200.00",
      material: "قطن",
      categoryId,
      description: "ترنج قطني للأولاد",
      status: "ACTIVE",
      variants: [
        { size: "10", color: "أحمر", quantity: 100, priceOverride: "200.00" },
        { size: "10", color: "أزرق", quantity: 100, priceOverride: "200.00" },
        { size: "12", color: "أزرق", quantity: 50, priceOverride: "200.00" },
        { size: "12", color: "بامبي", quantity: 60, priceOverride: "150.00" },
      ],
    });

    created.productIds.push(product.id);
    created.variantIds.push(...product.variants.map((variant) => variant.id));

    expect(product.material).toBe("قطن");
    expect(product.variants).toHaveLength(4);

    // Rows inherit the product's status, so an ACTIVE garment is sellable at once
    // and the catalog's default "sellable" filter can see it.
    const statuses = new Set(
      (
        await prisma.productVariant.findMany({
          where: { id: { in: product.variants.map((variant) => variant.id) } },
          select: { status: true },
        })
      ).map((variant) => variant.status),
    );
    expect([...statuses]).toEqual(["ACTIVE"]);

    const summary = product.variants
      .map((variant) => `${variant.size}/${variant.color}/${variant.availableQuantity}/${variant.priceOverride}`)
      .sort();
    expect(summary).toEqual(["10/أحمر/100/200", "10/أزرق/100/200", "12/أزرق/50/200", "12/بامبي/60/150"].sort());

    // Every row landed in the ledger as opening stock, in the branch warehouse.
    const movements = await prisma.stockMovement.findMany({
      where: { variantId: { in: created.variantIds }, type: "ADJUSTMENT" },
      select: { quantityChange: true, quantityOnHandAfter: true, reason: true, warehouseId: true },
    });
    expect(movements).toHaveLength(4);
    for (const movement of movements) {
      expect(movement.reason).toBe("رصيد افتتاحي");
      expect(movement.quantityOnHandAfter).toBe(movement.quantityChange);
      expect(movement.warehouseId).toBe(warehouseId);
    }

    // A generated SKU per row keeps them distinct even without typed codes.
    const skus = new Set(product.variants.map((variant) => variant.sku));
    expect(skus.size).toBe(4);
  });

  it("leaves stock out when a row has no quantity and can be topped up later", async () => {
    const product = await createProduct(staff, {
      name: `قميص بلا كمية ${Date.now().toString(36)}`,
      basePrice: "90.00",
      material: "كتان",
      categoryId,
      variants: [{ size: "M", color: "أبيض" }],
    });

    created.productIds.push(product.id);
    created.variantIds.push(product.variants[0].id);

    expect(product.variants[0].availableQuantity).toBe(0);

    const added = await createVariant(staff, product.id, { size: "L", color: "أبيض", quantity: 25 });
    const addedVariant = added.variants.find((variant) => variant.size === "L");
    created.variantIds.push(addedVariant!.id);

    expect(addedVariant!.availableQuantity).toBe(25);

    const movement = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: addedVariant!.id } });
    expect(movement.type).toBe("ADJUSTMENT");
    expect(movement.quantityChange).toBe(25);
  });

  it("edits the fabric later", async () => {
    const product = await createProduct(staff, {
      name: `جاكيت ${Date.now().toString(36)}`,
      basePrice: "300.00",
      material: "بوليستر",
      categoryId,
    });
    created.productIds.push(product.id);

    const updated = await updateProduct(staff, product.id, { material: "صوف" });

    expect(updated.material).toBe("صوف");
    void new Prisma.Decimal(0);
  });
});
