import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { deleteProduct } from "@/modules/catalog/application/product-management";
import { listProducts } from "@/modules/catalog/application/products";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
const created = { accountIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

beforeEach(async () => {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-del-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITDEL-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Delete",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(staffRecord.id);

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
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

async function makeProduct(name: string) {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const product = await prisma.product.create({
    data: {
      name,
      slug: `vitest-deletion-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("30.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITDEL-${suffix.toUpperCase()}`, size: "5", status: "ACTIVE" }] },
      images: {
        create: {
          fileKey: `vitest-deletion-${suffix}.png`,
          originalName: "deletion.png",
          mimeType: "image/png",
          sizeBytes: 68,
        },
      },
    },
    include: { variants: true },
  });

  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 3, quantityReserved: 0 },
  });
  await prisma.stockMovement.create({
    data: {
      variantId: product.variants[0].id,
      warehouseId: warehouse.id,
      type: "ADJUSTMENT",
      quantityChange: 3,
      quantityOnHandAfter: 3,
      quantityReservedAfter: 0,
    },
  });

  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));

  return product;
}

describe("deleteProduct", () => {
  it("removes the product with its variants, stock, movements and photos", async () => {
    const product = await makeProduct("Vitest Deletable");
    const variantId = product.variants[0].id;

    const removed = await deleteProduct(staff, product.id);
    expect(removed.name).toBe("Vitest Deletable");

    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
    expect(await prisma.productVariant.findUnique({ where: { id: variantId } })).toBeNull();
    expect(await prisma.inventoryItem.count({ where: { variantId } })).toBe(0);
    expect(await prisma.stockMovement.count({ where: { variantId } })).toBe(0);
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(0);

    const audit = await prisma.auditLog.findFirst({ where: { entityId: product.id, action: "PRODUCT_DELETED" } });
    expect(audit).not.toBeNull();

    const listed = await listProducts({ limit: 50, offset: 0 }, { search: "Vitest Deletable" });
    expect(listed.some((row) => row.id === product.id)).toBe(false);

    created.productIds = created.productIds.filter((id) => id !== product.id);
    created.variantIds = created.variantIds.filter((id) => id !== variantId);
  });

  it("refuses a product an order line references", async () => {
    const product = await makeProduct("Vitest Ordered");
    const classification =
      (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
      (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
    const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);
    const customerAccount = await prisma.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email: `vitest-del-buyer-${suffix}@example.com`,
        phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: "test-hash",
        customerProfile: {
          create: {
            customerCode: `VITDELC-${suffix.toUpperCase()}`,
            classificationId: classification.id,
            firstName: "Vitest",
            lastName: "Buyer",
          },
        },
      },
      include: { customerProfile: true },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `VITDEL-${suffix.toUpperCase()}`,
        customerProfileId: customerAccount.customerProfile!.id,
        status: "CONFIRMED",
        subtotalAmount: new Prisma.Decimal("30.00"),
        totalAmount: new Prisma.Decimal("30.00"),
        currency: "SAR",
        items: {
          create: [
            { variantId: product.variants[0].id, quantity: 1, unitPrice: new Prisma.Decimal("30.00"), discountAmount: new Prisma.Decimal(0) },
          ],
        },
      },
    });

    await expect(deleteProduct(staff, product.id)).rejects.toMatchObject({ statusCode: 409 });

    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.customerProfile.delete({ where: { id: customerAccount.customerProfile!.id } });
    await prisma.account.delete({ where: { id: customerAccount.id } });

    await deleteProduct(staff, product.id);
    created.productIds = created.productIds.filter((id) => id !== product.id);
    created.variantIds = created.variantIds.filter((id) => id !== product.variants[0].id);
  });
});
