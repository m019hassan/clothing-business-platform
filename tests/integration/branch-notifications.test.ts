import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { updateDelivery } from "@/modules/delivery/application/deliveries";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let branchA: { id: string; code: string; warehouseId: string };
let branchB: { id: string; code: string; warehouseId: string };
let distributor: TestAccount;
let stockKeeperA: TestAccount;
let stockKeeperB: TestAccount;
let dispatcherA: TestAccount;
let otherDispatcherA: TestAccount;
let customerAccountId: string;
let variantId: string;

const created = {
  accountIds: [] as string[],
  roleIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  profileIds: [] as string[],
};

async function makeRole(code: string, permissionCodes: string[]) {
  const role = await prisma.role.create({
    data: { code, name: code, isActive: true },
    select: { id: true },
  });
  created.roleIds.push(role.id);

  for (const permissionCode of permissionCodes) {
    const [moduleName] = permissionCode.split(".");
    const permission = await prisma.permission.upsert({
      where: { code: permissionCode },
      create: { code: permissionCode, name: permissionCode, module: moduleName, isActive: true },
      update: { isActive: true },
      select: { id: true },
    });

    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }

  return role.id;
}

async function makeEmployee(label: string, branchId: string, roleId: string) {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = `${Date.now().toString(36)}-${label}`.toUpperCase();

  const account = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-bn-${label}-${Date.now().toString(36)}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITBN-${suffix}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: label,
          branchId,
        },
      },
    },
    include: { employeeProfile: true },
  });
  created.accountIds.push(account.id);

  await prisma.employeeRole.create({
    data: { employeeId: account.employeeProfile!.id, roleId },
  });

  return {
    id: account.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: account.email,
    phone: account.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    employeeProfile: { id: account.employeeProfile!.id, branchId },
  } as unknown as TestAccount;
}

async function createBranch(label: string) {
  const suffix = `${Date.now().toString(36)}-${label}`.toUpperCase();
  const branch = await prisma.branch.create({
    data: { code: `BN-${suffix}`, name: `Notif ${label}` },
    select: { id: true, code: true },
  });
  const warehouse = await prisma.warehouse.create({
    data: { code: `BNW-${suffix}`, name: `Notif WH ${label}`, branchId: branch.id },
    select: { id: true },
  });

  created.branchIds.push(branch.id);
  created.warehouseIds.push(warehouse.id);

  return { id: branch.id, code: branch.code, warehouseId: warehouse.id };
}

beforeAll(async () => {
  branchA = await createBranch("a");
  branchB = await createBranch("b");

  const stockRole = await makeRole(`BNSTOCK_${Date.now().toString(36)}`.toUpperCase(), ["inventory.view"]);
  const dispatchRole = await makeRole(`BNDISP_${Date.now().toString(36)}`.toUpperCase(), ["shipping.manage"]);

  stockKeeperA = await makeEmployee("stocka", branchA.id, stockRole);
  stockKeeperB = await makeEmployee("stockb", branchB.id, stockRole);
  dispatcherA = await makeEmployee("dispa", branchA.id, dispatchRole);
  otherDispatcherA = await makeEmployee("dispb", branchA.id, dispatchRole);

  // distributor at branch A
  const distributorAccount = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-bn-dist-${Date.now().toString(36)}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `BD-${Date.now().toString(36).toUpperCase()}`,
          branchId: branchA.id,
          firstName: "Vitest",
          lastName: "Distributor",
        },
      },
    },
    include: { distributorProfile: true },
  });
  created.accountIds.push(distributorAccount.id);

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
      branchId: branchA.id,
      distributorCode: distributorAccount.distributorProfile!.distributorCode,
    },
  } as unknown as TestAccount;

  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));

  // buyer for the delivery flow
  const buyer = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-bn-buyer-${Date.now().toString(36)}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `BNBUY-${Date.now().toString(36).toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Buyer",
        },
      },
    },
    include: { customerProfile: true },
  });
  created.accountIds.push(buyer.id);
  created.profileIds.push(buyer.customerProfile!.id);
  customerAccountId = buyer.id;

  const product = await prisma.product.create({
    data: {
      name: `Vitest Notif ${Date.now().toString(36)}`,
      slug: `vitest-notif-${Date.now().toString(36)}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("20.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITBN-${Date.now().toString(36).toUpperCase()}`, status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  await prisma.inventoryItem.create({
    data: { variantId, warehouseId: branchA.warehouseId, quantityOnHand: 2, quantityReserved: 0 },
  });
});

afterAll(async () => {
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ branchId: { in: created.branchIds } }, { soldByAccountId: distributor?.id ?? "00000000-0000-0000-0000-000000000000" }],
    },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.employeeRole.deleteMany({ where: { employee: { accountId: { in: created.accountIds } } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("branch-aware notifications", () => {
  it("warns the stock keepers of the branch when a sale runs stock low, excluding the seller", async () => {
    await createPosSale(distributor, { items: [{ variantId, quantity: 1 }] });

    const notifications = await prisma.notification.findMany({
      where: { type: "INVENTORY", accountId: { in: created.accountIds } },
      select: { accountId: true, title: true, body: true },
    });

    const recipients = notifications.map((notification) => notification.accountId);
    expect(recipients).toContain(stockKeeperA.id);
    expect(recipients).not.toContain(stockKeeperB.id);
    expect(recipients).not.toContain(distributor.id);
    expect(recipients).not.toContain(dispatcherA.id);

    expect(notifications[0].title).toContain(branchA.code);
    expect(notifications[0].body ?? "").toMatch(/1 left|out of stock/i);
  });

  it("tells the branch dispatchers about a delivery status change, and the customer too", async () => {
    const profile = await prisma.customerProfile.findFirstOrThrow({
      where: { accountId: customerAccountId },
      select: { id: true },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `BN-${Date.now().toString(36).toUpperCase()}`,
        customerProfileId: profile.id,
        status: "CONFIRMED",
        branchId: branchA.id,
        subtotalAmount: new Prisma.Decimal("20.00"),
        totalAmount: new Prisma.Decimal("20.00"),
        currency: "SAR",
        delivery: { create: {} },
      },
      select: { id: true, delivery: { select: { id: true } } },
    });

    await updateDelivery(dispatcherA, order.delivery!.id, { status: "PROCESSING" });

    const rows = await prisma.notification.findMany({
      where: { type: "DELIVERY", entityId: order.id },
      select: { accountId: true },
    });
    const recipients = rows.map((row) => row.accountId);

    expect(recipients).toContain(customerAccountId);
    expect(recipients).toContain(otherDispatcherA.id);
    expect(recipients).not.toContain(dispatcherA.id);
    expect(recipients).not.toContain(stockKeeperA.id);
  });
});
