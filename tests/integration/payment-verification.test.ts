import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import { createOrderFromCart } from "@/modules/order/application/orders";
import {
  approvePayment,
  recordPaymentVerification,
  rejectPayment,
} from "@/modules/payment/application/payments";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let customer: TestAccount;
let staff: TestAccount;
let variantId: string;
const created = {
  accountIds: [] as string[],
  profileIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
};

async function awaitingPaymentOrder() {
  await addItem(customer, { variantId, quantity: 2 });
  const order = await createOrderFromCart(customer);
  await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });

  return { orderId: order.id, paymentId: payment.id };
}

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const customerRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-payver-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITPAYV-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Payver",
        },
      },
    },
    include: { customerProfile: true },
  });
  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-payver-staff-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITPAYVS-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Finance",
        },
      },
    },
    include: { employeeProfile: true },
  });
  const product = await prisma.product.create({
    data: {
      name: `Vitest Payver ${suffix}`,
      slug: `vitest-payver-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("60.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITPAYV-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 10, quantityReserved: 0 },
  });

  created.accountIds.push(customerRecord.id, staffRecord.id);
  created.profileIds.push(customerRecord.customerProfile!.id);
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  customer = {
    id: customerRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: customerRecord.email,
    phone: customerRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: customerRecord.createdAt,
    updatedAt: customerRecord.updatedAt,
    customerProfile: { id: customerRecord.customerProfile!.id },
  } as TestAccount;

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
  const orders = await prisma.order.findMany({
    where: { customerProfileId: { in: created.profileIds } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
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
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("recordPaymentVerification", () => {
  it("records that a transfer was checked and audits it", async () => {
    const { paymentId } = await awaitingPaymentOrder();

    const verified = await recordPaymentVerification(staff, paymentId);

    expect(verified.status).toBe("PENDING_VERIFICATION");
    const audit = await prisma.auditLog.findFirst({
      where: { accountId: staff.id, action: "PAYMENT_VERIFIED" },
    });
    expect(audit?.entityId).toBe(paymentId);
  });

  it("refuses to verify a payment that is no longer pending", async () => {
    const { paymentId } = await awaitingPaymentOrder();
    await recordPaymentVerification(staff, paymentId);

    await expect(recordPaymentVerification(staff, paymentId)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects an unknown or malformed payment id as not found", async () => {
    await expect(recordPaymentVerification(staff, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      recordPaymentVerification(staff, "11111111-2222-4333-8444-555555555555"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("approvePayment", () => {
  it("confirms the order, consumes stock and creates the delivery after a verification", async () => {
    const { orderId, paymentId } = await awaitingPaymentOrder();
    await recordPaymentVerification(staff, paymentId);

    const result = await approvePayment(staff, paymentId);

    expect(result.order.status).toBe("CONFIRMED");
    expect(result.payment.status).toBe("APPROVED");

    const inventory = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });
    expect(inventory.quantityOnHand).toBe(8);
    expect(inventory.quantityReserved).toBe(0);

    const delivery = await prisma.delivery.findFirst({ where: { orderId } });
    expect(delivery?.status).toBe("PENDING");

    const audit = await prisma.auditLog.findFirst({ where: { accountId: staff.id, action: "PAYMENT_APPROVED" } });
    expect(audit?.entityId).toBe(orderId);
  });

  it("approves a payment that was never verified (the decision is independent)", async () => {
    const { paymentId } = await awaitingPaymentOrder();

    const result = await approvePayment(staff, paymentId);

    expect(result.payment.status).toBe("APPROVED");
  });

  it("refuses to approve a payment whose order is no longer awaiting payment", async () => {
    const { paymentId } = await awaitingPaymentOrder();
    await approvePayment(staff, paymentId);

    await expect(approvePayment(staff, paymentId)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("stops before any state change when the permission is missing", async () => {
    const { orderId, paymentId } = await awaitingPaymentOrder();
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing payments.approve."));

    await expect(approvePayment(staff, paymentId)).rejects.toMatchObject({ statusCode: 403 });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(payment.status).toBe("PENDING");
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("payments.approve");
  });
});

describe("rejectPayment", () => {
  it("cancels the order, releases the reservation and notifies the customer", async () => {
    const { orderId, paymentId } = await awaitingPaymentOrder();
    await recordPaymentVerification(staff, paymentId);

    const result = await rejectPayment(staff, paymentId);

    expect(result.order.status).toBe("CANCELLED");
    expect(result.payment.status).toBe("REJECTED");

    const inventory = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });
    expect(inventory.quantityOnHand).toBe(10);
    expect(inventory.quantityReserved).toBe(0);

    const notification = await prisma.notification.findFirst({
      where: { accountId: customer.id, entityId: orderId, title: { contains: "Payment rejected" } },
    });
    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("PAYMENT");

    const audit = await prisma.auditLog.findFirst({ where: { accountId: staff.id, action: "PAYMENT_REJECTED" } });
    expect(audit?.entityId).toBe(orderId);
  });
});
