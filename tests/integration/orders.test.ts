import { beforeEach, describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import { createOrderFromCart, getOrder } from "@/modules/order/application/orders";
import { updateOrderStatus } from "@/modules/order/application/order-status";
import { simulatePaymentOutcome } from "@/modules/payment/application/payments";
import { getAccountOverview } from "@/modules/customers/application/account";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let customer: TestAccount;
let otherCustomer: TestAccount;
let employee: TestAccount;
let variantId: string;

async function seedFixtures() {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));

  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);
  const passwordHash = "test-hash";

  const [a, b, e] = await Promise.all([
    prisma.account.create({
      data: {
        accountType: "CUSTOMER", status: "ACTIVE", email: `vitest-o-${suffix}@example.com`,
        phone: `+9667${Math.floor(10000000 + Math.random() * 89999999)}`, passwordHash,
        customerProfile: { create: { customerCode: `VITO-${suffix.toUpperCase()}`, classificationId: classification.id, firstName: "Vit", lastName: "Owner" } },
      },
      include: { customerProfile: true },
    }),
    prisma.account.create({
      data: {
        accountType: "CUSTOMER", status: "ACTIVE", email: `vitest-x-${suffix}@example.com`,
        phone: `+9667${Math.floor(20000000 + Math.random() * 8999999)}`, passwordHash,
        customerProfile: { create: { customerCode: `VITX-${suffix.toUpperCase()}`, classificationId: classification.id, firstName: "Vit", lastName: "Other" } },
      },
      include: { customerProfile: true },
    }),
    prisma.account.create({
      data: {
        accountType: "EMPLOYEE", status: "ACTIVE", email: `vitest-e-${suffix}@example.com`,
        phone: `+9668${Math.floor(10000000 + Math.random() * 8999999)}`, passwordHash,
        employeeProfile: { create: { employeeNumber: `VITE-${suffix.toUpperCase()}`, departmentId: department.id, firstName: "Vit", lastName: "Staff" } },
      },
      include: { employeeProfile: true },
    }),
  ]);

  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));

  const product = await prisma.product.create({
    data: {
      name: `Vitest Order Product ${suffix}`, slug: `vitest-order-${suffix}`, status: "ACTIVE",
      basePrice: new Prisma.Decimal("80.00"), currency: "SAR", categoryId: category.id,
      variants: { create: [{ sku: `VITO-${suffix}`, size: "M", color: "Black", status: "ACTIVE", priceOverride: new Prisma.Decimal("40.00") }] },
    },
    include: { variants: true },
  });

  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));

  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 10, quantityReserved: 0 },
  });

  return { a, b, e, variantId: product.variants[0].id };
}

beforeEach(async () => {
  const fixtures = await seedFixtures();
  customer = { id: fixtures.a.id, accountType: "CUSTOMER", status: "ACTIVE", email: fixtures.a.email, phone: fixtures.a.phone, emailVerified: false, phoneVerified: false, preferredLanguage: "ar", timezone: "Asia/Riyadh", createdAt: fixtures.a.createdAt, updatedAt: fixtures.a.updatedAt, customerProfile: { id: fixtures.a.customerProfile!.id } } as TestAccount;
  otherCustomer = { id: fixtures.b.id, accountType: "CUSTOMER", status: "ACTIVE", email: fixtures.b.email, phone: fixtures.b.phone, emailVerified: false, phoneVerified: false, preferredLanguage: "ar", timezone: "Asia/Riyadh", createdAt: fixtures.b.createdAt, updatedAt: fixtures.b.updatedAt, customerProfile: { id: fixtures.b.customerProfile!.id } } as TestAccount;
  employee = { id: fixtures.e.id, accountType: "EMPLOYEE", status: "ACTIVE", email: fixtures.e.email, phone: fixtures.e.phone, emailVerified: false, phoneVerified: false, preferredLanguage: "ar", timezone: "Asia/Riyadh", createdAt: fixtures.e.createdAt, updatedAt: fixtures.e.updatedAt, employeeProfile: { id: fixtures.e.employeeProfile!.id } } as TestAccount;
  variantId = fixtures.variantId;
});

async function createOrderFor(account: TestAccount, quantity = 1) {
  await addItem(account, { variantId, quantity });
  return createOrderFromCart(account);
}

describe("order lifecycle", () => {
  it("creates an order from the cart and keeps the reservation", async () => {
    const baseline = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId }, select: { quantityOnHand: true, quantityReserved: true } });

    await addItem(customer, { variantId, quantity: 2 });
    const reservedInCart = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId }, select: { quantityOnHand: true, quantityReserved: true } });
    expect(reservedInCart.quantityReserved).toBe(baseline.quantityReserved + 2);

    const order = await createOrderFromCart(customer);

    expect(order.status).toBe("DRAFT");
    expect(order.orderNumber).toMatch(/^ORD-/);
    expect(order.totalAmount).toBe("80");
    expect(order.items[0].unitPrice).toBe("40");

    // Order creation converts the cart but must keep the reservation untouched.
    const afterOrder = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId }, select: { quantityOnHand: true, quantityReserved: true } });
    expect(afterOrder.quantityOnHand).toBe(baseline.quantityOnHand);
    expect(afterOrder.quantityReserved).toBe(reservedInCart.quantityReserved);
  });

  it("payment success confirms the order and consumes stock", async () => {
    const order = await createOrderFor(customer, 2);
    const before = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId }, select: { quantityOnHand: true, quantityReserved: true } });

    await updateOrderStatus(customer, order.id, "PENDING_PAYMENT");
    const result = await simulatePaymentOutcome(customer, order.id, "success");

    expect(result.order.status).toBe("CONFIRMED");
    expect(result.payment.status).toBe("APPROVED");

    const after = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId }, select: { quantityOnHand: true, quantityReserved: true } });
    expect(after.quantityOnHand).toBe(before.quantityOnHand - 2);
    expect(after.quantityReserved).toBe(before.quantityReserved - 2);
  });

  it("payment outcome is recorded on the order payment record", async () => {
    const order = await createOrderFor(customer, 1);
    const payment = await prisma.payment.findFirst({ where: { orderId: order.id }, select: { status: true, amount: true } });
    expect(payment?.status).toBe("PENDING");
    expect(payment?.amount.toString()).toBe("40");
  });
});

describe("order authorization", () => {
  it("hides other customers' orders (404 semantics)", async () => {
    const order = await createOrderFor(customer, 1);

    await expect(getOrder(otherCustomer, order.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("employees are not customer accounts for cart purposes", async () => {
    await expect(addItem(employee, { variantId, quantity: 1 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("invalid order ids are rejected as not found", async () => {
    await expect(getOrder(customer, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("account overview", () => {
  it("exposes the customer profile without sensitive fields", async () => {
    const overview = await getAccountOverview(customer);

    expect(overview.customer?.customerCode).toBeTruthy();
    expect(JSON.stringify(overview)).not.toMatch(/passwordHash|salary|nationalId/i);
  });

  it("exposes the employee profile without sensitive fields", async () => {
    const overview = await getAccountOverview(employee);
    expect(overview.employee?.employeeNumber).toBeTruthy();
    expect(JSON.stringify(overview)).not.toMatch(/passwordHash|salary|nationalId/i);
  });
});

describe("payment outcome simulation (service level)", () => {
  it("records the outcome via the guarded service", async () => {
    const order = await createOrderFor(customer, 1);
    const submitted = await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
    expect(submitted.status).toBe("PENDING_PAYMENT");

    const result = await simulatePaymentOutcome(customer, order.id, "success");

    expect(result.order.status).toBe("CONFIRMED");
    expect(result.payment.status).toBe("APPROVED");

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId }, select: { quantityOnHand: true } });
    expect(inventory?.quantityOnHand).toBe(9);
  });
});
