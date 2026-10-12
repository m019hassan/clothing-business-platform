import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { listPosSales } from "@/modules/pos/application/pos-returns";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let distributor: TestAccount;
let branchId: string;
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
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `SFB-${suffix.toUpperCase()}`, name: `Swap Filter ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `SFW-${suffix.toUpperCase()}`, name: `Swap Filter WH ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);

  const product = await prisma.product.create({
    data: {
      name: `Swap ${suffix}`,
      slug: `swap-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("30.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `SF-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [{ variantId, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 }],
  });

  const distributorAccount = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-swapf-${suffix}@example.com`,
      phone: `+2012${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `SFD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Swap",
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
  await prisma.swapRequest.deleteMany({ where: { orderId: { in: orderIds } } });
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

describe("POS history swap filter flag", () => {
  it("marks a sale as under swap until its swap request arrives", async () => {
    await createPosSale(distributor, { items: [{ variantId, quantity: 2 }] });

    const order = await prisma.order.findFirstOrThrow({
      where: { branchId },
      select: { id: true, items: { select: { id: true } } },
    });

    const before = await listPosSales(distributor);
    expect(before.find((row) => row.orderId === order.id)?.underSwap).toBe(false);

    const swap = await prisma.swapRequest.create({
      data: {
        orderId: order.id,
        orderItemId: order.items[0].id,
        branchId,
        quantity: 1,
      },
    });

    const during = await listPosSales(distributor);
    expect(during.find((row) => row.orderId === order.id)?.underSwap).toBe(true);

    await prisma.swapRequest.update({ where: { id: swap.id }, data: { stage: "RECEIVED" } });

    const after = await listPosSales(distributor);
    expect(after.find((row) => row.orderId === order.id)?.underSwap).toBe(false);
  });
});
