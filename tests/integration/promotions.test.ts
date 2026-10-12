import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createPromotion, getActiveDiscountMap, setPromotionActive } from "@/modules/catalog/application/promotions";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let actor: TestAccount;
let productId: string;
let variantId: string;
let branchId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  promotionIds: [] as string[],
};

function window(hoursFromNow: number, hoursToNow2: number) {
  const now = Date.now();
  return {
    startsAt: new Date(now + hoursFromNow * 3600_000).toISOString(),
    endsAt: new Date(now + hoursToNow2 * 3600_000).toISOString(),
  };
}

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `PDB-${suffix.toUpperCase()}`, name: `Promo Branch ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `PDW-${suffix.toUpperCase()}`, name: `Promo WH ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);

  const product = await prisma.product.create({
    data: {
      name: `Promo ${suffix}`,
      slug: `promo-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("100.00"),
      cost: new Prisma.Decimal("60.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `PD-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  productId = product.id;
  variantId = product.variants[0].id;

  await prisma.inventoryItem.createMany({
    data: [{ variantId, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 }],
  });

  const account = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-promo-${suffix}@example.com`,
      phone: `+2013${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `PDD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Promo",
        },
      },
    },
    include: { distributorProfile: true },
  });
  created.accountIds.push(account.id);

  actor = {
    id: account.id,
    accountType: "DISTRIBUTOR",
    status: "ACTIVE",
    email: account.email,
    phone: account.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Africa/Cairo",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    distributorProfile: {
      id: account.distributorProfile!.id,
      branchId: branch.id,
      distributorCode: account.distributorProfile!.distributorCode,
    },
  } as unknown as TestAccount;
});

afterAll(async () => {
  const orders = await prisma.order.findMany({ where: { branchId: { in: created.branchIds } }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  await prisma.promotion.deleteMany({ where: { id: { in: created.promotionIds } } });
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

describe("promotions", () => {
  it("validates input and records an audit entry", async () => {
    await expect(
      createPromotion(actor, { ...window(-1, 24), name: "سيء", percent: 0, productIds: [productId] }),
    ).rejects.toThrowError();

    const promotion = await createPromotion(actor, {
      ...window(-1, 24),
      name: "خصم اختبار",
      percent: 15,
      productIds: [productId],
    });
    created.promotionIds.push(promotion.id);

    expect(promotion.status).toBe("ACTIVE");

    const audit = await prisma.auditLog.findFirst({
      where: { accountId: actor.id, action: "PROMOTION_CREATED", entityId: promotion.id },
    });
    expect(audit).not.toBeNull();
  });

  it("maps only live campaigns and lets the highest percent win", async () => {
    const base = await createPromotion(actor, { ...window(-1, 24), name: "أساسي", percent: 15, productIds: [productId] });
    const upcoming = await createPromotion(actor, { ...window(2, 5), name: "قادم", percent: 30, productIds: [productId] });
    const rival = await createPromotion(actor, { ...window(-1, 2), name: "منافس", percent: 20, productIds: [productId] });
    const expired = await createPromotion(actor, { ...window(-48, -24), name: "منتهي", percent: 40, productIds: [productId] });
    created.promotionIds.push(base.id, upcoming.id, rival.id, expired.id);

    let map = await getActiveDiscountMap(prisma);
    expect(map.get(productId)).toBe(20);

    await setPromotionActive(actor, rival.id, false);
    map = await getActiveDiscountMap(prisma);
    expect(map.get(productId)).toBe(15);
  });

  it("snapshots the discounted price into the POS sale while cost stays raw", async () => {
    const promotion = await createPromotion(actor, { ...window(-1, 24), name: "بيع", percent: 15, productIds: [productId] });
    created.promotionIds.push(promotion.id);

    await createPosSale(actor, { items: [{ variantId, quantity: 1 }] });

    const item = await prisma.orderItem.findFirstOrThrow({
      where: { order: { branchId }, variantId },
    });

    expect(item.unitPrice.toFixed(2)).toBe("85.00");
    expect(item.unitCost?.toFixed(2)).toBe("60.00");
  });
});
