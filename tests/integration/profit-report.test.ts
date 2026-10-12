import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { getProfitReport } from "@/modules/reports/application/profit";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let distributor: TestAccount;
let branchId: string;
let variantCosted: string;
let variantUncosted: string;
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
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `PFB-${suffix.toUpperCase()}`, name: `Profit Branch ${suffix}` },
    select: { id: true, code: true, name: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { kind: "STORE", code: `PFW-${suffix.toUpperCase()}`, name: `Profit Warehouse ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);

  const costed = await prisma.product.create({
    data: {
      name: `Costed ${suffix}`,
      slug: `profit-costed-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("100.00"),
      cost: new Prisma.Decimal("60.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `PF-A-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(costed.id);
  created.variantIds.push(costed.variants[0].id);
  variantCosted = costed.variants[0].id;

  const uncosted = await prisma.product.create({
    data: {
      name: `Uncosted ${suffix}`,
      slug: `profit-uncosted-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("50.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `PF-B-${suffix}`, size: "L", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(uncosted.id);
  created.variantIds.push(uncosted.variants[0].id);
  variantUncosted = uncosted.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [
      { variantId: variantCosted, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
      { variantId: variantUncosted, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
    ],
  });

  const distributorAccount = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-profit-${suffix}@example.com`,
      phone: `+201${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `PFD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Profit",
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
    timezone: "Africa/Cairo",
    createdAt: distributorAccount.createdAt,
    updatedAt: distributorAccount.updatedAt,
    distributorProfile: {
      id: distributorAccount.distributorProfile!.id,
      branchId: branch.id,
      distributorCode: distributorAccount.distributorProfile!.distributorCode,
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
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("profit tracking", () => {
  it("snapshots the product cost onto the sale line", async () => {
    await createPosSale(distributor, { items: [{ variantId: variantCosted, quantity: 2 }] });

    const item = await prisma.orderItem.findFirstOrThrow({
      where: { order: { branchId }, variantId: variantCosted },
    });

    expect(item.unitCost?.toFixed(2)).toBe("60.00");
    expect(item.unitPrice.toFixed(2)).toBe("100.00");
  });

  it("reports revenue, cost and profit net of returns, and flags missing costs", async () => {
    await createPosSale(distributor, {
      items: [
        { variantId: variantCosted, quantity: 2 },
        { variantId: variantUncosted, quantity: 1 },
      ],
    });

    const scope = { branchId, warehouseIds: null, branchLabel: null };
    const permissions = new Set<string>(["products.cost.view", "orders.view"]);
    const report = await getProfitReport(permissions, "all", scope);

    expect(report.totals.revenue).toBe("250.00");
    expect(report.totals.cost).toBe("120.00");
    expect(report.totals.profit).toBe("130.00");
    expect(report.totals.missingCostUnits).toBe(1);
    expect(report.rows[0].profit).toBe("80.00");
    expect(report.rows[1].profit).toBe("50.00");
    expect(report.rows[1].missingCostUnits).toBe(1);

    const costedItem = await prisma.orderItem.findFirstOrThrow({
      where: { order: { branchId }, variantId: variantCosted },
    });
    await prisma.orderItem.update({ where: { id: costedItem.id }, data: { returnedQuantity: 1 } });

    const afterReturn = await getProfitReport(permissions, "all", scope);
    expect(afterReturn.totals.revenue).toBe("150.00");
    expect(afterReturn.totals.cost).toBe("60.00");
    expect(afterReturn.totals.profit).toBe("90.00");
    expect(afterReturn.totals.missingCostUnits).toBe(1);
  });

  it("returns nothing without the cost permission", async () => {
    const report = await getProfitReport(new Set<string>(["orders.view"]), "all", {
      branchId,
      warehouseIds: null,
      branchLabel: null,
    });

    expect(report.rows).toEqual([]);
    expect(report.totals.revenue).toBe("0.00");
  });
});
