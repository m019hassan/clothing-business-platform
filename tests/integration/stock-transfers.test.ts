import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { listTransferTargets, transferStock } from "@/modules/inventory/application/transfers";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let variantId: string;
let fromWarehouseId: string;
let factoryBranchId: string;
let shopBranchId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
};

beforeEach(async () => {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const factory = await prisma.branch.create({
    data: { code: `FAC-${suffix.toUpperCase()}`, name: `Factory ${suffix}` },
  });
  const shop = await prisma.branch.create({
    data: { code: `SHOP-${suffix.toUpperCase()}`, name: `Shop ${suffix}` },
  });
  created.branchIds.push(factory.id, shop.id);
  factoryBranchId = factory.id;
  shopBranchId = shop.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `WH-${suffix.toUpperCase()}`, name: `Warehouse ${suffix}`, branchId: factory.id },
  });
  created.warehouseIds.push(warehouse.id);
  fromWarehouseId = warehouse.id;

  const product = await prisma.product.create({
    data: {
      name: `Transfer Product ${suffix}`,
      slug: `transfer-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("25.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `TRF-${suffix.toUpperCase()}`, size: "5", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));
  variantId = product.variants[0].id;

  await prisma.inventoryItem.create({
    data: { variantId, warehouseId: warehouse.id, quantityOnHand: 500, quantityReserved: 0 },
  });

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-transfer-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITTRF-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Transfer",
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
  const shops = await prisma.warehouse.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  const warehouseIds = [...created.warehouseIds, ...shops.map((shop) => shop.id)];

  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { warehouseId: { in: warehouseIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("transferStock", () => {
  it("moves units to another branch and writes both ledger sides", async () => {
    const result = await transferStock(staff, {
      variantId,
      fromWarehouseId,
      toBranchId: shopBranchId,
      quantity: 200,
    });

    expect(result.quantity).toBe(200);
    expect(result.toBranchName).toContain("Shop");

    const source = await prisma.inventoryItem.findUniqueOrThrow({
      where: { variantId_warehouseId: { variantId, warehouseId: fromWarehouseId } },
      select: { quantityOnHand: true },
    });
    expect(source.quantityOnHand).toBe(300);

    const destinationWarehouse = await prisma.warehouse.findFirstOrThrow({
      where: { branchId: shopBranchId, isActive: true },
      select: { id: true },
    });
    const destination = await prisma.inventoryItem.findUniqueOrThrow({
      where: { variantId_warehouseId: { variantId, warehouseId: destinationWarehouse.id } },
      select: { quantityOnHand: true },
    });
    expect(destination.quantityOnHand).toBe(200);

    const movements = await prisma.stockMovement.findMany({
      where: { variantId, type: "TRANSFER" },
      select: { warehouseId: true, quantityChange: true },
    });
    expect(movements).toHaveLength(2);
    expect(movements.find((movement) => movement.warehouseId === fromWarehouseId)?.quantityChange).toBe(-200);
    expect(movements.find((movement) => movement.warehouseId === destinationWarehouse.id)?.quantityChange).toBe(200);

    const audit = await prisma.auditLog.findFirst({ where: { entityId: variantId, action: "STOCK_TRANSFERRED" } });
    expect(audit).not.toBeNull();
  });

  it("refuses to move more than the free quantity and to move within one branch", async () => {
    await expect(
      transferStock(staff, { variantId, fromWarehouseId, toBranchId: shopBranchId, quantity: 501 }),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      transferStock(staff, { variantId, fromWarehouseId, toBranchId: factoryBranchId, quantity: 10 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lists active branches as destinations and creates the warehouse on first use", async () => {
    const targets = await listTransferTargets();
    expect(targets.some((target) => target.branchId === shopBranchId)).toBe(true);

    await transferStock(staff, { variantId, fromWarehouseId, toBranchId: shopBranchId, quantity: 5 });

    const created = await prisma.warehouse.findFirst({ where: { branchId: shopBranchId, isActive: true } });
    expect(created).not.toBeNull();
  });
});
