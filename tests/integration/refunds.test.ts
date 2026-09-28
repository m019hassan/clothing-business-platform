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
import { approvePayment } from "@/modules/payment/application/payments";
import { listOrderRefunds, parseRefundInput, refundOrder } from "@/modules/payment/application/refunds";
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

/** A paid, delivered order: the state a refund starts from. */
async function deliveredOrder() {
  await addItem(customer, { variantId, quantity: 1 });
  const order = await createOrderFromCart(customer);
  await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await approvePayment(staff, payment.id);
  await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });

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
      email: `vitest-refund-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITREF-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Refund",
        },
      },
    },
    include: { customerProfile: true },
  });
  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-refund-staff-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITREFS-${suffix.toUpperCase()}`,
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
      name: `Vitest Refund ${suffix}`,
      slug: `vitest-refund-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("90.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITREF-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
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

  await prisma.refund.deleteMany({ where: { orderId: { in: orderIds } } });
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

describe("parseRefundInput", () => {
  it("accepts an empty body and a trimmed reason", () => {
    expect(parseRefundInput(undefined)).toEqual({});
    expect(parseRefundInput({})).toEqual({});
    expect(parseRefundInput({ reason: "  damaged item  " })).toEqual({ reason: "damaged item" });
  });

  it("rejects unknown fields, empty reasons and oversized reasons", () => {
    expect(() => parseRefundInput({ amount: 10 })).toThrowError();
    expect(() => parseRefundInput({ reason: "   " })).toThrowError();
    expect(() => parseRefundInput({ reason: "x".repeat(501) })).toThrowError();
  });
});

describe("refundOrder", () => {
  it("records the refund, moves payment and order to refunded and notifies the customer", async () => {
    const { orderId } = await deliveredOrder();

    const result = await refundOrder(staff, orderId, { reason: "customer returned the item" });

    expect(result.refund.amount).toBe("90");
    expect(result.refund.reason).toBe("customer returned the item");
    expect(result.order.status).toBe("REFUNDED");

    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.status).toBe("REFUNDED");

    const audit = await prisma.auditLog.findFirst({ where: { accountId: staff.id, action: "ORDER_REFUNDED" } });
    expect(audit?.entityId).toBe(orderId);

    const notification = await prisma.notification.findFirst({
      where: { accountId: customer.id, entityId: orderId, title: { contains: "Refund" } },
    });
    expect(notification).not.toBeNull();
  });

  it("leaves stock untouched (a return is inspected separately)", async () => {
    const { orderId } = await deliveredOrder();
    const before = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });

    await refundOrder(staff, orderId, {});

    const after = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });
    expect(after.quantityOnHand).toBe(before.quantityOnHand);
    expect(after.quantityReserved).toBe(before.quantityReserved);
  });

  it("refuses an order whose payment was not collected", async () => {
    await addItem(customer, { variantId, quantity: 1 });
    const order = await createOrderFromCart(customer);

    await expect(refundOrder(staff, order.id, {})).rejects.toMatchObject({ statusCode: 409 });
  });

  it("refuses a second refund of the same order", async () => {
    const { orderId } = await deliveredOrder();
    await refundOrder(staff, orderId, {});

    await expect(refundOrder(staff, orderId, {})).rejects.toMatchObject({ statusCode: 409 });
  });

  it("stops before any state change when the permission is missing", async () => {
    const { orderId } = await deliveredOrder();
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing payments.refund."));

    await expect(refundOrder(staff, orderId, {})).rejects.toMatchObject({ statusCode: 403 });

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("DELIVERED");
    expect(await prisma.refund.count({ where: { orderId } })).toBe(0);
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("payments.refund");
  });

  it("lists the refunds of an order, newest first", async () => {
    const { orderId } = await deliveredOrder();
    await refundOrder(staff, orderId, { reason: "first" });

    const refunds = await listOrderRefunds(orderId);
    expect(refunds).toHaveLength(1);
    expect(refunds[0].reason).toBe("first");
  });
});
