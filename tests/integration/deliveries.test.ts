import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import {
  DELIVERY_TRANSITIONS,
  cancelDeliveryForOrder,
  ensureDeliveryForOrder,
  getDelivery,
  listDeliveries,
  parseDeliveryFilters,
  parseDeliveryUpdateInput,
  updateDelivery,
} from "@/modules/delivery/application/deliveries";
import { createOrderFromCart } from "@/modules/order/application/orders";
import { simulatePaymentOutcome } from "@/modules/payment/application/payments";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let customer: TestAccount;
let variantId: string;
const created = { accountIds: [] as string[], profileIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

async function confirmedOrder() {
  await addItem(customer, { variantId, quantity: 1 });
  const order = await createOrderFromCart(customer);
  const submitted = await prisma.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
  expect(submitted.status).toBe("PENDING_PAYMENT");
  const result = await simulatePaymentOutcome(customer, order.id, "success");

  return result.order;
}

beforeEach(async () => {
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
      email: `vitest-delivery-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITDEL-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Delivery",
        },
      },
    },
    include: { customerProfile: true },
  });
  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-delivery-staff-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITDELS-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Ops",
        },
      },
    },
    include: { employeeProfile: true },
  });

  const product = await prisma.product.create({
    data: {
      name: `Vitest Delivery ${suffix}`,
      slug: `vitest-delivery-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("75.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITDEL-${suffix}`, size: "M", status: "ACTIVE" }] },
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
  const orders = await prisma.order.findMany({ where: { customerProfileId: { in: created.profileIds } }, select: { id: true } });
  const orderIds = orders.map((order) => order.id);
  await prisma.delivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
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

describe("parseDeliveryUpdateInput / parseDeliveryFilters", () => {
  it("accepts a status transition and trims metadata", () => {
    expect(parseDeliveryUpdateInput({ status: "PROCESSING", carrier: "  Aramex ", notes: "  picked " })).toEqual({
      status: "PROCESSING",
      carrier: "Aramex",
      notes: "picked",
    });
  });

  it("rejects unknown statuses, unknown keys and empty payloads", () => {
    expect(() => parseDeliveryUpdateInput({ status: "FLYING" })).toThrowError();
    expect(() => parseDeliveryUpdateInput({ carrier: "X", extra: 1 })).toThrowError();
    expect(() => parseDeliveryUpdateInput({})).toThrowError();
    expect(() => parseDeliveryFilters(new URLSearchParams({ status: "FLYING" }))).toThrowError();
    expect(parseDeliveryFilters(new URLSearchParams())).toEqual({});
  });

  it("documents the state machine", () => {
    expect(DELIVERY_TRANSITIONS.PENDING).toContain("PROCESSING");
    expect(DELIVERY_TRANSITIONS.SHIPPED).toEqual(["DELIVERED", "CANCELLED"]);
    expect(DELIVERY_TRANSITIONS.DELIVERED).toHaveLength(0);
  });
});

describe("delivery lifecycle", () => {
  it("creates the delivery when the payment is approved", async () => {
    const order = await confirmedOrder();

    const delivery = await getDelivery(staff, (await prisma.delivery.findUniqueOrThrow({ where: { orderId: order.id }, select: { id: true } })).id);
    expect(delivery.status).toBe("PENDING");
    expect(delivery.orderNumber).toBe(order.orderNumber);
  });

  it("advances through the states and requires carrier + tracking to ship", async () => {
    const order = await confirmedOrder();
    const record = await prisma.delivery.findUniqueOrThrow({ where: { orderId: order.id }, select: { id: true } });

    await expect(updateDelivery(staff, record.id, { status: "READY" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(updateDelivery(staff, record.id, { status: "SHIPPED" })).rejects.toMatchObject({ statusCode: 409 });

    let delivery = await updateDelivery(staff, record.id, { status: "PROCESSING" });
    expect(delivery.status).toBe("PROCESSING");

    delivery = await updateDelivery(staff, record.id, { status: "READY" });
    expect(delivery.status).toBe("READY");

    await expect(updateDelivery(staff, record.id, { status: "SHIPPED" })).rejects.toMatchObject({ statusCode: 400 });

    delivery = await updateDelivery(staff, record.id, { status: "SHIPPED", carrier: "Aramex", trackingNumber: "ARX-1" });
    expect(delivery.status).toBe("SHIPPED");
    expect(delivery.dispatchedAt).not.toBeNull();

    delivery = await updateDelivery(staff, record.id, { status: "DELIVERED" });
    expect(delivery.status).toBe("DELIVERED");
    expect(delivery.deliveredAt).not.toBeNull();

    // terminal
    await expect(updateDelivery(staff, record.id, { status: "PROCESSING" })).rejects.toMatchObject({ statusCode: 409 });

    const audits = await prisma.auditLog.count({ where: { entity: "Delivery", entityId: record.id, action: "DELIVERY_STATUS_CHANGED" } });
    expect(audits).toBe(4);
  });

  it("lists the fulfilment queue with filters and pagination", async () => {
    const order = await confirmedOrder();

    const all = await listDeliveries(staff, { limit: 50, offset: 0 });
    expect(all.pagination.total).toBeGreaterThanOrEqual(1);
    const row = all.deliveries.find((delivery) => delivery.orderId === order.id);
    expect(row).toMatchObject({ status: "PENDING", customerCode: expect.stringContaining("VITDEL") });

    const pending = await listDeliveries(staff, { limit: 50, offset: 0 }, { status: "PENDING" });
    expect(pending.deliveries.every((delivery) => delivery.status === "PENDING")).toBe(true);

    const delivered = await listDeliveries(staff, { limit: 50, offset: 0 }, { status: "DELIVERED" });
    expect(delivered.deliveries.some((delivery) => delivery.orderId === order.id)).toBe(false);
  });

  it("cancels the delivery when the order is cancelled and refuses later edits", async () => {
    const order = await confirmedOrder();
    const record = await prisma.delivery.findUniqueOrThrow({ where: { orderId: order.id }, select: { id: true } });

    const cancelled = await prisma.$transaction((transaction) => cancelDeliveryForOrder(transaction, order.id));
    expect(cancelled).toBe(1);

    const delivery = await getDelivery(staff, record.id);
    expect(delivery.status).toBe("CANCELLED");

    await expect(updateDelivery(staff, record.id, { status: "PROCESSING" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(updateDelivery(staff, record.id, { carrier: "Aramex" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("is idempotent when ensuring a delivery", async () => {
    const order = await confirmedOrder();
    const record = await prisma.delivery.findUniqueOrThrow({ where: { orderId: order.id }, select: { id: true } });

    await prisma.$transaction((transaction) => ensureDeliveryForOrder(transaction, order.id));

    expect(await prisma.delivery.count({ where: { orderId: order.id } })).toBe(1);
    expect((await getDelivery(staff, record.id)).status).toBe("PENDING");
  });

  it("rejects unknown delivery ids", async () => {
    await expect(getDelivery(staff, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ statusCode: 404 });
    await expect(getDelivery(staff, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
  });
});
