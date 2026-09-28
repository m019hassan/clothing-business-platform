import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import { createOrderFromCart } from "@/modules/order/application/orders";
import { approvePayment, rejectPayment } from "@/modules/payment/application/payments";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const TRICKLE = 6;
const AVAILABLE = 3;

let customers: TestAccount[] = [];
let distributor: TestAccount;
let variantId: string;
let inventoryItemId: string;
const created = {
  accountIds: [] as string[],
  profileIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
};

function accountShape(record: {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: record.email,
    phone: record.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function createCustomer(label: string): Promise<TestAccount> {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const record = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-race-${label}-${Date.now().toString(36)}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITRACE-${label}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Race",
          lastName: label,
        },
      },
    },
    include: { customerProfile: true },
  });

  created.accountIds.push(record.id);
  created.profileIds.push(record.customerProfile!.id);

  return { ...accountShape(record), customerProfile: { id: record.customerProfile!.id } } as TestAccount;
}

beforeEach(async () => {
  customers = [];
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  // The branch owns the only warehouse in play, so POS sales and reservations
  // compete for the same rows.
  const branch = await prisma.branch.create({ data: { code: `RACE-${suffix.toUpperCase()}`, name: `Race ${suffix}` } });
  const warehouse = await prisma.warehouse.create({
    data: { code: `RACEW-${suffix.toUpperCase()}`, name: `Race WH ${suffix}`, branchId: branch.id },
  });
  created.branchIds.push(branch.id);
  created.warehouseIds.push(warehouse.id);

  const product = await prisma.product.create({
    data: {
      name: `Vitest Race ${suffix}`,
      slug: `vitest-race-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("40.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITRACE-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  const inventory = await prisma.inventoryItem.create({
    data: {
      variantId: product.variants[0].id,
      warehouseId: warehouse.id,
      quantityOnHand: AVAILABLE,
      quantityReserved: 0,
    },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;
  inventoryItemId = inventory.id;

  const distributorRecord = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-race-dist-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `VITRACED-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Race",
          lastName: "Distributor",
        },
      },
    },
    include: { distributorProfile: true },
  });
  created.accountIds.push(distributorRecord.id);

  distributor = {
    ...accountShape(distributorRecord),
    accountType: "DISTRIBUTOR",
    distributorProfile: { id: distributorRecord.distributorProfile!.id, branchId: branch.id },
  } as unknown as TestAccount;
  expect(distributor.distributorProfile?.branchId).toBe(branch.id);

  for (let index = 0; index < TRICKLE; index += 1) {
    customers.push(await createCustomer(String.fromCharCode(97 + index)));
  }
});

afterAll(async () => {
  // Point-of-sale fixtures create a walk-in buyer per branch inside the sale
  // transaction; it belongs to this run and must be removed with it.
  const walkIns = await prisma.account.findMany({
    where: {
      phone: { startsWith: "WALKIN-" },
      customerProfile: { branchId: { in: created.branchIds } },
    },
    select: { id: true, customerProfile: { select: { id: true } } },
  });

  for (const walkIn of walkIns) {
    created.accountIds.push(walkIn.id);

    if (walkIn.customerProfile) {
      created.profileIds.push(walkIn.customerProfile.id);
    }
  }

  const orders = await prisma.order.findMany({
    where: { customerProfileId: { in: created.profileIds } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.notificationPreference.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.cartItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cart.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

async function inventory() {
  return prisma.inventoryItem.findUniqueOrThrow({
    where: { id: inventoryItemId },
    select: { quantityOnHand: true, quantityReserved: true },
  });
}

function expectConsistent(stock: { quantityOnHand: number; quantityReserved: number }) {
  expect(stock.quantityOnHand).toBeGreaterThanOrEqual(0);
  expect(stock.quantityReserved).toBeGreaterThanOrEqual(0);
  expect(stock.quantityReserved).toBeLessThanOrEqual(stock.quantityOnHand);
}

describe("concurrency (real PostgreSQL connection pool)", () => {
  it("reserves exactly the available units when six carts race for three", async () => {
    const results = await Promise.allSettled(
      customers.map((customer) => addItem(customer, { variantId, quantity: 1 })),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(AVAILABLE);
    expect(rejected).toHaveLength(TRICKLE - AVAILABLE);

    for (const failure of rejected) {
      expect((failure as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });
    }

    const stock = await inventory();
    expect(stock.quantityReserved).toBe(AVAILABLE);
    expect(stock.quantityOnHand).toBe(AVAILABLE);
    expectConsistent(stock);

    // One reservation movement per winner and never more than the stock allows.
    const reservations = await prisma.stockMovement.count({
      where: { variantId, type: "RESERVATION" },
    });
    expect(reservations).toBe(AVAILABLE);
  });

  it("confirms a racing payment decision exactly once", async () => {
    await addItem(customers[0], { variantId, quantity: 2 });
    const order = await createOrderFromCart(customers[0]);
    await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });

    const results = await Promise.allSettled([
      approvePayment(distributor, payment.id),
      rejectPayment(distributor, payment.id),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });

    const decided = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    const settledOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const stock = await inventory();

    if (decided.status === "APPROVED") {
      expect(settledOrder.status).toBe("CONFIRMED");
      // Consumed: the two reserved units left the warehouse for good.
      expect(stock.quantityOnHand).toBe(AVAILABLE - 2);
      expect(stock.quantityReserved).toBe(0);
    } else {
      expect(decided.status).toBe("REJECTED");
      expect(settledOrder.status).toBe("CANCELLED");
      // Released: nothing left the warehouse.
      expect(stock.quantityOnHand).toBe(AVAILABLE);
      expect(stock.quantityReserved).toBe(0);
    }

    expectConsistent(stock);
  });

  it("sells two units to four racing terminals and oversells nothing", async () => {
    const terminals = 4;
    const forSale = 2;
    await prisma.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantityOnHand: forSale } });

    const results = await Promise.allSettled(
      Array.from({ length: terminals }, () => createPosSale(distributor, { items: [{ variantId, quantity: 1 }] })),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    // Identical one-unit sales against two units: exactly two must win, and the
    // losers must be clean conflicts rather than unique-constraint failures from
    // the walk-in buyer creation.
    expect(fulfilled).toHaveLength(forSale);
    expect(rejected).toHaveLength(terminals - forSale);

    for (const failure of rejected) {
      expect((failure as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });
    }

    const stock = await inventory();
    expect(stock.quantityOnHand).toBe(0);
    expect(stock.quantityReserved).toBe(0);
    expectConsistent(stock);

    // The branch has exactly one walk-in buyer however many terminals sold.
    const walkIns = await prisma.customerProfile.count({ where: { branchId: created.branchIds.at(-1), isWalkIn: true } });
    expect(walkIns).toBe(1);
  });
});
