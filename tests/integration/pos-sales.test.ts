import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createPosSale, getPosCatalog, parsePosSaleInput } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let distributor: TestAccount;
let customer: TestAccount;
let branchId: string;
let variantA: string;
let variantB: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  profileIds: [] as string[],
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ variantId: variantA, quantity: 2 }],
    ...overrides,
  };
}

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `POSB-${suffix.toUpperCase()}`, name: `POS Branch ${suffix}` },
    select: { id: true, code: true, name: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `POSW-${suffix.toUpperCase()}`, name: `POS Warehouse ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);

  const product = await prisma.product.create({
    data: {
      name: `POS Product ${suffix}`,
      slug: `pos-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("40.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `POS-A-${suffix}`, size: "M", status: "ACTIVE", priceOverride: new Prisma.Decimal("35.00") },
          { sku: `POS-B-${suffix}`, size: "L", status: "ACTIVE" },
        ],
      },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));
  variantA = product.variants[0].id;
  variantB = product.variants[1].id;

  await prisma.inventoryItem.createMany({
    data: [
      { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
      { variantId: product.variants[1].id, warehouseId: warehouse.id, quantityOnHand: 1, quantityReserved: 0 },
    ],
  });

  const distributorAccount = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-pos-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `D-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Distributor",
        },
      },
    },
    include: { distributorProfile: true },
  });
  const customerAccount = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-pos-c-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `POSC-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Buyer",
        },
      },
    },
    include: { customerProfile: true },
  });

  created.accountIds.push(distributorAccount.id, customerAccount.id);
  created.profileIds.push(customerAccount.customerProfile!.id);

  distributor = {
    id: distributorAccount.id,
    accountType: "DISTRIBUTOR",
    status: "ACTIVE",
    email: distributorAccount.email,
    phone: distributorAccount.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: distributorAccount.createdAt,
    updatedAt: distributorAccount.updatedAt,
    distributorProfile: {
      id: distributorAccount.distributorProfile!.id,
      branchId: branch.id,
      distributorCode: distributorAccount.distributorProfile!.distributorCode,
    },
  } as unknown as TestAccount;

  customer = {
    id: customerAccount.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: customerAccount.email,
    phone: customerAccount.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: customerAccount.createdAt,
    updatedAt: customerAccount.updatedAt,
    customerProfile: { id: customerAccount.customerProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  const orders = await prisma.order.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  // walk-in profiles created by the sales live under the test branches
  await prisma.customerProfile.deleteMany({ where: { branchId: { in: created.branchIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("parsePosSaleInput", () => {
  it("accepts a sale and merges repeated variants", () => {
    const input = parsePosSaleInput({
      items: [
        { variantId: variantA, quantity: 1 },
        { variantId: variantA, quantity: 2 },
        { variantId: variantB, quantity: 1 },
      ],
    });

    expect(input.items).toHaveLength(2);
    expect(input.items.find((item) => item.variantId === variantA)?.quantity).toBe(3);
  });

  it("rejects empty, oversized and malformed payloads", () => {
    expect(() => parsePosSaleInput({ items: [] })).toThrowError();
    expect(() => parsePosSaleInput({ items: [{ variantId: variantA, quantity: 0 }] })).toThrowError();
    expect(() => parsePosSaleInput({ items: [{ variantId: variantA, quantity: 1.5 }] })).toThrowError();
    expect(() => parsePosSaleInput({ items: [{ variantId: "nope", quantity: 1 }] })).toThrowError();
    expect(() => parsePosSaleInput({ items: [], extra: 1 })).toThrowError();
    expect(() => parsePosSaleInput("nope")).toThrowError();
  });
});

describe("getPosCatalog", () => {
  it("returns the branch stock with prices", async () => {
    const catalog = await getPosCatalog(distributor);

    expect(catalog.branchId).toBe(branchId);
    const item = catalog.items.find((entry) => entry.variantId === variantA);
    expect(item).toMatchObject({ availableQuantity: 5, unitPrice: "35" });

    const noOverride = catalog.items.find((entry) => entry.variantId === variantB);
    expect(noOverride?.unitPrice).toBe("40");
  });

  it("refuses non-distributor accounts", async () => {
    await expect(getPosCatalog(customer)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("createPosSale", () => {
  it("confirms the order, takes the cash payment and decrements branch stock", async () => {
    const receipt = await createPosSale(distributor, payload());

    expect(receipt.status).toBe("CONFIRMED");
    expect(receipt.totalAmount).toBe("70");
    expect(receipt.branchCode).toBeTruthy();
    expect(receipt.lines).toHaveLength(1);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: receipt.orderId },
      select: {
        channel: true,
        status: true,
        branchId: true,
        soldByAccountId: true,
        payments: { select: { status: true, method: true } },
        customerProfile: { select: { isWalkIn: true, branchId: true } },
      },
    });

    expect(order.channel).toBe("POS");
    expect(order.branchId).toBe(branchId);
    expect(order.soldByAccountId).toBe(distributor.id);
    expect(order.payments[0]).toMatchObject({ status: "APPROVED", method: "CASH" });
    expect(order.customerProfile).toMatchObject({ isWalkIn: true, branchId });

    const inventory = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId: variantA } });
    expect(inventory.quantityOnHand).toBe(3);

    const movements = await prisma.stockMovement.findMany({
      where: { variantId: variantA, type: "CONSUMPTION" },
      select: { quantityChange: true, reason: true, quantityOnHandAfter: true },
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].quantityChange).toBe(-2);
    expect(movements[0].reason).toContain("POS sale");
  });

  it("reuses the branch walk-in buyer for the next sale", async () => {
    await createPosSale(distributor, payload());
    await createPosSale(distributor, payload());

    const walkIns = await prisma.customerProfile.count({ where: { branchId, isWalkIn: true } });
    expect(walkIns).toBe(1);
  });

  it("rejects insufficient stock, unknown variants and other account types", async () => {
    await expect(
      createPosSale(distributor, { items: [{ variantId: variantB, quantity: 5 }] }),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      createPosSale(distributor, { items: [{ variantId: "00000000-0000-4000-8000-000000000000", quantity: 1 }] }),
    ).rejects.toMatchObject({ statusCode: 404 });

    await expect(createPosSale(customer, payload())).rejects.toMatchObject({ statusCode: 403 });
  });
});
