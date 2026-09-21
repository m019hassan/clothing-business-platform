import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem, getCart, removeItem, updateItem } from "@/modules/cart/application/cart-service";
import {
  adjustStock,
  listStockMovements,
  parseAdjustmentInput,
  parseMovementFilters,
} from "@/modules/inventory/application/movements";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;

let customer: TestAccount;
let variantId: string;
let inventoryItemId: string;
const created = {
  productIds: [] as string[],
  variantIds: [] as string[],
  accountIds: [] as string[],
  profileIds: [] as string[],
  cartIds: [] as string[],
};

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const product = await prisma.product.create({
    data: {
      name: `Vitest Ledger ${suffix}`,
      slug: `vitest-ledger-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("50.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITLED-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  const inventoryItem = await prisma.inventoryItem.create({
    data: {
      variantId: product.variants[0].id,
      warehouseId: warehouse.id,
      quantityOnHand: 10,
      quantityReserved: 0,
    },
  });

  const accountRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-ledger-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITLED-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Ledger",
        },
      },
    },
    include: { customerProfile: true },
  });

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-ledger-staff-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITLEDS-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Staff",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  created.accountIds.push(accountRecord.id, staffRecord.id);
  created.profileIds.push(accountRecord.customerProfile!.id);

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

  variantId = product.variants[0].id;
  inventoryItemId = inventoryItem.id;
  customer = {
    id: accountRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: accountRecord.email,
    phone: accountRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: accountRecord.createdAt,
    updatedAt: accountRecord.updatedAt,
    customerProfile: { id: accountRecord.customerProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.cartItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cart.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseAdjustmentInput", () => {
  it("accepts a signed whole number and trims the reason", () => {
    const input = parseAdjustmentInput({
      variantId: "11111111-2222-4333-8444-555555555555",
      quantityChange: -3,
      reason: "  Damaged in storage ",
    });

    expect(input).toEqual({
      variantId: "11111111-2222-4333-8444-555555555555",
      quantityChange: -3,
      reason: "Damaged in storage",
    });
  });

  it("rejects zero, fractional, oversized, unknown and malformed payloads", () => {
    const base = { variantId: "11111111-2222-4333-8444-555555555555" };

    expect(() => parseAdjustmentInput({ ...base, quantityChange: 0 })).toThrowError();
    expect(() => parseAdjustmentInput({ ...base, quantityChange: 1.5 })).toThrowError();
    expect(() => parseAdjustmentInput({ ...base, quantityChange: 200000 })).toThrowError();
    expect(() => parseAdjustmentInput({ ...base, quantityChange: 1, extra: true })).toThrowError();
    expect(() => parseAdjustmentInput({ ...base, quantityChange: 1, variantId: "nope" })).toThrowError();
    expect(() => parseAdjustmentInput({ ...base, quantityChange: 1, reason: "   " })).toThrowError();
    expect(() => parseAdjustmentInput("nope")).toThrowError();
  });

  it("parses the movement filters", () => {
    expect(parseMovementFilters(new URLSearchParams())).toEqual({});
    expect(
      parseMovementFilters(new URLSearchParams({ variantId: "11111111-2222-4333-8444-555555555555" })),
    ).toEqual({ variantId: "11111111-2222-4333-8444-555555555555" });
    expect(() => parseMovementFilters(new URLSearchParams({ variantId: "nope" }))).toThrowError();
  });
});

describe("adjustStock", () => {
  it("increases on-hand stock and appends an adjustment row", async () => {
    const result = await adjustStock(staff, { variantId, quantityChange: 5, reason: "Stock count correction" });

    expect(result.quantityOnHand).toBe(15);
    expect(result.quantityReserved).toBe(0);
    expect(result.availableQuantity).toBe(15);

    const movements = await listStockMovements(staff, { limit: 10, offset: 0 }, { variantId });
    expect(movements.pagination.total).toBe(1);
    expect(movements.movements[0]).toMatchObject({
      type: "ADJUSTMENT",
      quantityChange: 5,
      quantityOnHandAfter: 15,
      quantityReservedAfter: 0,
      reason: "Stock count correction",
      actorAccountId: staff.id,
    });
  });

  it("decreases on-hand stock and keeps the reserved quantity protected", async () => {
    await addItem(customer, { variantId, quantity: 2 });

    const decreased = await adjustStock(staff, { variantId, quantityChange: -6 });
    expect(decreased.quantityOnHand).toBe(4);
    expect(decreased.quantityReserved).toBe(2);

    await expect(adjustStock(staff, { variantId, quantityChange: -3 })).rejects.toMatchObject({
      statusCode: 409,
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
    expect(inventory.quantityOnHand).toBe(4);
    expect(inventory.quantityReserved).toBe(2);
  });

  it("creates the inventory row when the variant has none", async () => {
    const extraVariant = await prisma.productVariant.create({
      data: { productId: created.productIds[0], sku: `VITLED-EXTRA-${Date.now().toString(36)}`, status: "ACTIVE" },
      select: { id: true },
    });
    created.variantIds.push(extraVariant.id);

    const result = await adjustStock(staff, { variantId: extraVariant.id, quantityChange: 4 });

    expect(result.quantityOnHand).toBe(4);
    expect(result.availableQuantity).toBe(4);
  });

  it("rejects unknown variants with 404", async () => {
    await expect(
      adjustStock(staff, { variantId: "00000000-0000-4000-8000-000000000000", quantityChange: 1 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("ledger wiring for the cart flow", () => {
  it("records reservation, release and consumption-oriented entries", async () => {
    await addItem(customer, { variantId, quantity: 3 });

    const item = (await getCart(customer)).items[0];
    await updateItem(customer, item.id, { quantity: 2 });
    await removeItem(customer, item.id);

    const movements = await listStockMovements(staff, { limit: 20, offset: 0 }, { variantId });
    const types = movements.movements.map((movement) => movement.type);

    expect(types).toEqual(["RELEASE", "RELEASE", "RESERVATION"]);
    expect(movements.movements[2]).toMatchObject({
      quantityChange: 0,
      quantityReservedAfter: 3,
      actorAccountId: customer.id,
      reason: "Cart item added",
    });
    expect(movements.movements[1]).toMatchObject({ quantityReservedAfter: 2 });
    expect(movements.movements[0]).toMatchObject({ quantityReservedAfter: 0 });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
    expect(inventory.quantityOnHand).toBe(10);
    expect(inventory.quantityReserved).toBe(0);
  });
});
