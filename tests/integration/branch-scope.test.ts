import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { GLOBAL_BRANCH_SCOPE, resolveBranchScope } from "@/modules/branches/application/scope";
import { listDeliveries } from "@/modules/delivery/application/deliveries";
import { getInventoryPage, getInventorySummary } from "@/modules/inventory/application/inventory";
import { listStockMovements } from "@/modules/inventory/application/movements";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let branchA: { id: string; code: string; name: string; warehouseId: string };
let branchB: { id: string; code: string; name: string; warehouseId: string };
let employeeA: TestAccount;
let headOffice: TestAccount;
let variantId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  profileIds: [] as string[],
};

async function createBranch(label: string) {
  const suffix = `${Date.now().toString(36)}-${label}`.toUpperCase();

  const branch = await prisma.branch.create({
    data: { code: `SC-${suffix}`, name: `Scope ${label}` },
    select: { id: true, code: true, name: true },
  });
  const warehouse = await prisma.warehouse.create({
    data: { code: `SCW-${suffix}`, name: `Scope WH ${label}`, branchId: branch.id },
    select: { id: true },
  });

  created.branchIds.push(branch.id);
  created.warehouseIds.push(warehouse.id);

  return { ...branch, warehouseId: warehouse.id };
}

async function createEmployee(label: string, branchId: string | null) {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = `${Date.now().toString(36)}-${label}`.toUpperCase();

  const account = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-scope-${label}-${Date.now().toString(36)}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITS-${suffix}`,
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

  return {
    account: {
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
    } as unknown as TestAccount,
    profileId: account.employeeProfile!.id,
  };
}

beforeAll(async () => {
  branchA = await createBranch("a");
  branchB = await createBranch("b");

  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));

  const product = await prisma.product.create({
    data: {
      name: `Vitest Scope ${Date.now().toString(36)}`,
      slug: `vitest-scope-${Date.now().toString(36)}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("10.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITSC-${Date.now().toString(36).toUpperCase()}`, status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [
      { variantId, warehouseId: branchA.warehouseId, quantityOnHand: 5, quantityReserved: 1 },
      { variantId, warehouseId: branchB.warehouseId, quantityOnHand: 7, quantityReserved: 0 },
    ],
  });

  await prisma.stockMovement.createMany({
    data: [
      {
        variantId,
        warehouseId: branchA.warehouseId,
        type: "ADJUSTMENT",
        quantityChange: 5,
        quantityOnHandAfter: 5,
        quantityReservedAfter: 1,
        reason: "scope test A",
      },
      {
        variantId,
        warehouseId: branchB.warehouseId,
        type: "ADJUSTMENT",
        quantityChange: 7,
        quantityOnHandAfter: 7,
        quantityReservedAfter: 0,
        reason: "scope test B",
      },
    ],
  });

  const first = await createEmployee("a", branchA.id);
  const second = await createEmployee("hq", null);
  employeeA = first.account;
  headOffice = second.account;

  // one POS-style order per branch so deliveries can be scoped
  const walkIn = async (branch: { id: string; code: string; name: string }) => {
    const account = await prisma.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email: null,
        phone: `WALKIN-SC-${branch.code}`.slice(0, 20),
        passwordHash: "walkin-no-login",
      },
      select: { id: true },
    });
    created.accountIds.push(account.id);

    const profile = await prisma.customerProfile.create({
      data: {
        accountId: account.id,
        customerCode: `WALKIN-${branch.code}`.slice(0, 50),
        classificationId: (await prisma.customerClassification.findFirstOrThrow({ where: { code: "RETAIL" } })).id,
        firstName: "Walk-in",
        isWalkIn: true,
        branchId: branch.id,
      },
      select: { id: true },
    });
    created.profileIds.push(profile.id);

    return profile.id;
  };

  for (const branch of [branchA, branchB]) {
    const profileId = await walkIn(branch);
    const order = await prisma.order.create({
      data: {
        orderNumber: `SC-${branch.code}-${Date.now().toString(36).toUpperCase()}`,
        customerProfileId: profileId,
        status: "CONFIRMED",
        channel: "POS",
        branchId: branch.id,
        subtotalAmount: new Prisma.Decimal("10.00"),
        totalAmount: new Prisma.Decimal("10.00"),
        currency: "SAR",
      },
      select: { id: true },
    });

    await prisma.delivery.create({ data: { orderId: order.id } });
  }
});

afterAll(async () => {
  const orders = await prisma.order.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);

  await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("resolveBranchScope", () => {
  it("resolves the branch and its warehouses for a branch employee", async () => {
    const scope = await resolveBranchScope(employeeA);

    expect(scope.branchId).toBe(branchA.id);
    expect(scope.warehouseIds).toEqual([branchA.warehouseId]);
    expect(scope.branchLabel).toContain(branchA.code);
  });

  it("keeps the global view for accounts without a branch", async () => {
    const scope = await resolveBranchScope(headOffice);

    expect(scope).toEqual(GLOBAL_BRANCH_SCOPE);
    expect(scope.warehouseIds).toBeNull();
  });
});

describe("scoped reads", () => {
  it("limits the inventory page and summary to the branch warehouses", async () => {
    const scope = await resolveBranchScope(employeeA);
    const page = await getInventoryPage({ limit: 5000, offset: 0 }, scope);

    const rows = page.rows.filter((row) => row.variantId === variantId);
    expect(rows).toHaveLength(1);
    expect(rows[0].warehouseId).toBe(branchA.warehouseId);
    expect(rows[0].quantityOnHand).toBe(5);

    const summary = await getInventorySummary(scope);
    const globalSummary = await getInventorySummary();
    expect(summary.trackedRows).toBeLessThan(globalSummary.trackedRows);
    expect(summary.totalOnHand).toBeLessThan(globalSummary.totalOnHand);
  });

  it("keeps the global view for head office", async () => {
    const scope = await resolveBranchScope(headOffice);
    const page = await getInventoryPage({ limit: 5000, offset: 0 }, scope);
    const rows = page.rows.filter((row) => row.variantId === variantId);

    expect(rows).toHaveLength(2);
  });

  it("limits the movement ledger to the branch warehouses", async () => {
    const movements = await listStockMovements(employeeA, { limit: 100, offset: 0 }, { variantId });
    const reasons = movements.movements.map((movement) => movement.reason);

    expect(reasons).toContain("scope test A");
    expect(reasons).not.toContain("scope test B");
    expect(movements.movements.every((movement) => movement.warehouseId === branchA.warehouseId)).toBe(true);
  });

  it("limits the delivery queue to the branch orders", async () => {
    const scoped = await listDeliveries(employeeA, { limit: 100, offset: 0 });
    const headOfficeQueue = await listDeliveries(headOffice, { limit: 100, offset: 0 });

    expect(scoped.deliveries.every((delivery) => delivery.orderId !== undefined)).toBe(true);
    expect(scoped.pagination.total).toBeLessThan(headOfficeQueue.pagination.total);

    const branchDeliveries = await prisma.delivery.findMany({
      where: { order: { branchId: branchA.id } },
      select: { id: true },
    });
    expect(scoped.pagination.total).toBe(branchDeliveries.length);
  });
});
