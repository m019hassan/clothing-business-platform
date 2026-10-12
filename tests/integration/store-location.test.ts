import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { transferStock } from "@/modules/inventory/application/transfers";
import { createPosSale, resolveWarehouseIds } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let opsActor: TestAccount;
let distributor: TestAccount;
let branchId: string;
let storeId: string;
let storageId: string;
let variantId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
};

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `SLB-${suffix.toUpperCase()}`, name: `Store Branch ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const store = await prisma.warehouse.create({
    data: { code: `SLS-${suffix.toUpperCase()}`, name: `Store ${suffix}`, branchId: branch.id, kind: "STORE" },
    select: { id: true },
  });
  created.warehouseIds.push(store.id);
  storeId = store.id;

  const storage = await prisma.warehouse.create({
    data: { code: `SLL-${suffix.toUpperCase()}`, name: `Storage ${suffix}`, kind: "STORAGE" },
    select: { id: true },
  });
  created.warehouseIds.push(storage.id);
  storageId = storage.id;

  const product = await prisma.product.create({
    data: {
      name: `Store Product ${suffix}`,
      slug: `store-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("50.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `SL-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [{ variantId, warehouseId: storage.id, quantityOnHand: 5, quantityReserved: 0 }],
  });

  const ops = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-store-ops-${suffix}@example.com`,
      phone: `+2015${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `SLE-${suffix.toUpperCase()}`,
          departmentId: department.id,
          branchId: null,
          firstName: "Vitest",
          lastName: "Ops",
        },
      },
    },
    include: { employeeProfile: true },
  });
  created.accountIds.push(ops.id);

  opsActor = {
    id: ops.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: ops.email,
    phone: ops.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Africa/Cairo",
    createdAt: ops.createdAt,
    updatedAt: ops.updatedAt,
    employeeProfile: { id: ops.employeeProfile!.id, branchId: null },
  } as unknown as TestAccount;

  const seller = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-store-seller-${suffix}@example.com`,
      phone: `+2016${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `SLD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Seller",
        },
      },
    },
    include: { distributorProfile: true },
  });
  created.accountIds.push(seller.id);

  distributor = {
    id: seller.id,
    accountType: "DISTRIBUTOR",
    status: "ACTIVE",
    email: seller.email,
    phone: seller.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Africa/Cairo",
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
    distributorProfile: {
      id: seller.distributorProfile!.id,
      branchId: branch.id,
      distributorCode: seller.distributorProfile!.distributorCode,
    },
  } as unknown as TestAccount;
});

afterAll(async () => {
  const orders = await prisma.order.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { branchId: { in: created.branchIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("store locations", () => {
  it("sells only from the branch store, and a warehouse transfer fills it", async () => {
    const resolved = await resolveWarehouseIds(branchId);
    expect(resolved).toEqual([storeId]);

    await expect(createPosSale(distributor, { items: [{ variantId, quantity: 1 }] })).rejects.toThrowError();

    await transferStock(opsActor, {
      variantId,
      fromWarehouseId: storageId,
      toBranchId: branchId,
      quantity: 3,
    });

    const storeItem = await prisma.inventoryItem.findFirstOrThrow({
      where: { variantId, warehouseId: storeId },
    });
    const storageItem = await prisma.inventoryItem.findFirstOrThrow({
      where: { variantId, warehouseId: storageId },
    });

    expect(storeItem.quantityOnHand).toBe(3);
    expect(storageItem.quantityOnHand).toBe(2);

    await createPosSale(distributor, { items: [{ variantId, quantity: 2 }] });

    const after = await prisma.inventoryItem.findFirstOrThrow({
      where: { variantId, warehouseId: storeId },
    });

    expect(after.quantityOnHand).toBe(1);
  });
});
