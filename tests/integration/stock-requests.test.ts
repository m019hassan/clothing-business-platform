import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createStockRequest, fulfillStockRequest } from "@/modules/inventory/application/stock-requests";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let requester: TestAccount;
let warehouseKeeper: TestAccount;
let branchId: string;
let storageId: string;
let variantId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  roleIds: [] as string[],
};

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const permission =
    (await prisma.permission.findFirst({ where: { code: "inventory.adjust" } })) ??
    (await prisma.permission.create({ data: { code: "inventory.adjust", name: "Adjust inventory", module: "inventory" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `SRB-${suffix.toUpperCase()}`, name: `Request Branch ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const storage = await prisma.warehouse.create({
    data: { code: `SRS-${suffix.toUpperCase()}`, name: `Storage ${suffix}`, kind: "STORAGE" },
    select: { id: true },
  });
  created.warehouseIds.push(storage.id);
  storageId = storage.id;

  const product = await prisma.product.create({
    data: {
      name: `SR Product ${suffix}`,
      slug: `sr-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("40.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `SR-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [{ variantId, warehouseId: storage.id, quantityOnHand: 5, quantityReserved: 0 }],
  });

  const role = await prisma.role.create({
    data: { code: `SRR-${suffix.toUpperCase()}`, name: `Keeper ${suffix}`, isActive: true },
  });
  created.roleIds.push(role.id);
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

  const keeper = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-sr-keeper-${suffix}@example.com`,
      phone: `+2017${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `SRK-${suffix.toUpperCase()}`,
          departmentId: department.id,
          branchId: null,
          firstName: "Vitest",
          lastName: "Keeper",
        },
      },
    },
    include: { employeeProfile: true },
  });
  created.accountIds.push(keeper.id);
  await prisma.employeeRole.create({ data: { employeeId: keeper.employeeProfile!.id, roleId: role.id } });

  warehouseKeeper = {
    id: keeper.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: keeper.email,
    phone: keeper.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Africa/Cairo",
    createdAt: keeper.createdAt,
    updatedAt: keeper.updatedAt,
    employeeProfile: { id: keeper.employeeProfile!.id, branchId: null },
  } as unknown as TestAccount;

  const seller = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-sr-seller-${suffix}@example.com`,
      phone: `+2018${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `SRD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Seller",
        },
      },
    },
    include: { distributorProfile: true },
  });
  created.accountIds.push(seller.id);

  requester = {
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
  const requests = await prisma.stockRequest.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  await prisma.stockRequestItem.deleteMany({ where: { requestId: { in: requests.map((request) => request.id) } } });
  await prisma.stockRequest.deleteMany({ where: { id: { in: requests.map((request) => request.id) } } });
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeRole.deleteMany({ where: { employee: { accountId: { in: created.accountIds } } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("stock requests", () => {
  it("notifies the warehouse, then fulfilling lands the goods in the branch store", async () => {
    const request = await createStockRequest(requester, {
      items: [{ variantId, quantity: 2 }],
      note: "محتاجين مقاس M",
    });

    expect(request.status).toBe("PENDING");
    expect(request.itemCount).toBe(1);

    const alert = await prisma.notification.findFirst({
      where: { accountId: warehouseKeeper.id, entityType: "StockRequest", entityId: request.id },
    });
    expect(alert).not.toBeNull();

    const fulfilled = await fulfillStockRequest(warehouseKeeper, request.id, { fromWarehouseId: storageId });

    expect(fulfilled.status).toBe("FULFILLED");

    const store = await prisma.warehouse.findFirstOrThrow({ where: { branchId, kind: "STORE" } });
    const storeItem = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId, warehouseId: store.id } });
    const storageItem = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId, warehouseId: storageId } });

    expect(storeItem.quantityOnHand).toBe(2);
    expect(storageItem.quantityOnHand).toBe(3);

    const confirmation = await prisma.notification.findFirst({
      where: { accountId: requester.id, entityType: "StockRequest", entityId: request.id },
    });
    expect(confirmation).not.toBeNull();
  });
});
