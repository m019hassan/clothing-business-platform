import "server-only";

import { randomBytes } from "node:crypto";

import {
  AccountType,
  CartStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { OrderListPage, OrderSummaryView, OrderView } from "@/modules/order/types";
import { createNotification } from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;
const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_NUMBER_RANDOM_LENGTH = 6;

export const orderSelection = {
  id: true,
  orderNumber: true,
  status: true,
  currency: true,
  subtotalAmount: true,
  totalAmount: true,
  createdAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      variantId: true,
      quantity: true,
      unitPrice: true,
      discountAmount: true,
      variant: {
        select: {
          sku: true,
          size: true,
          color: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { status: true, amount: true, currency: true, method: true },
  },
} satisfies Prisma.OrderSelect;

type OrderRecord = Prisma.OrderGetPayload<{ select: typeof orderSelection }>;

const orderSummarySelection = {
  id: true,
  orderNumber: true,
  status: true,
  currency: true,
  subtotalAmount: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

type OrderSummaryRecord = Prisma.OrderGetPayload<{ select: typeof orderSummarySelection }>;

function requireCustomerProfile(account: AuthenticatedAccount) {
  if (account.accountType !== AccountType.CUSTOMER || !account.customerProfile) {
    throw new AuthorizationError("A customer account is required.");
  }

  return account.customerProfile;
}

function generateOrderNumber(now: Date): string {
  const datePart = [
    now.getUTCFullYear().toString().padStart(4, "0"),
    (now.getUTCMonth() + 1).toString().padStart(2, "0"),
    now.getUTCDate().toString().padStart(2, "0"),
  ].join("");

  const randomPart = Array.from(
    randomBytes(ORDER_NUMBER_RANDOM_LENGTH),
    (byte) => ORDER_NUMBER_ALPHABET[byte % ORDER_NUMBER_ALPHABET.length],
  ).join("");

  return `ORD-${datePart}-${randomPart}`;
}

export function mapOrder(order: OrderRecord): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount.toString(),
    totalAmount: order.totalAmount.toString(),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      sku: item.variant.sku,
      size: item.variant.size,
      color: item.variant.color,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      discountAmount: item.discountAmount.toString(),
      lineTotal: item.unitPrice.mul(item.quantity).toString(),
    })),
    payment: order.payments[0]
      ? {
          status: order.payments[0].status,
          amount: order.payments[0].amount.toString(),
          currency: order.payments[0].currency,
          method: order.payments[0].method,
        }
      : null,
  };
}

function mapOrderSummary(order: OrderSummaryRecord): OrderSummaryView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount.toString(),
    totalAmount: order.totalAmount.toString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    itemCount: order._count.items,
  };
}

export async function listOrders(
  account: AuthenticatedAccount,
  pagination: Pagination,
): Promise<OrderListPage> {
  const profile = requireCustomerProfile(account);
  const where: Prisma.OrderWhereInput = { customerProfileId: profile.id };

  const [orders, total] = await withDatabaseError(() =>
    prisma.$transaction([
      prisma.order.findMany({
        where,
        select: orderSummarySelection,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.order.count({ where }),
    ]),
  );

  return {
    orders: orders.map(mapOrderSummary),
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    },
  };
}

export async function getOrder(
  account: AuthenticatedAccount,
  orderId: string,
): Promise<OrderView> {
  const profile = requireCustomerProfile(account);

  if (!isUuid(orderId)) {
    throw new NotFoundError("Order not found.");
  }

  const order = await withDatabaseError(() =>
    prisma.order.findFirst({
      where: { id: orderId, customerProfileId: profile.id },
      select: orderSelection,
    }),
  );

  if (!order) {
    throw new NotFoundError("Order not found.");
  }

  return mapOrder(order);
}

async function runOrderTransaction<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      try {
        return await operation();
      } catch (retryError) {
        if (
          retryError instanceof Prisma.PrismaClientKnownRequestError &&
          retryError.code === "P2002"
        ) {
          throw new ConflictError("The order could not be created. Please try again.");
        }

        throw retryError;
      }
    }

    throw error;
  }
}

export async function createOrderFromCart(
  account: AuthenticatedAccount,
): Promise<OrderView> {
  const profile = requireCustomerProfile(account);

  return withDatabaseError(() =>
    runOrderTransaction(() =>
      prisma.$transaction(async (transaction) => {
        const cart = await transaction.cart.findFirst({
          where: { customerProfileId: profile.id, status: CartStatus.ACTIVE },
          select: {
            id: true,
            items: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                quantity: true,
                variant: {
                  select: {
                    id: true,
                    status: true,
                    priceOverride: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                        status: true,
                        deletedAt: true,
                        basePrice: true,
                        currency: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!cart) {
          throw new NotFoundError("No active cart was found.");
        }

        if (cart.items.length === 0) {
          throw new ValidationError("The cart is empty.");
        }

        for (const item of cart.items) {
          if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new ValidationError(
              "The cart contains an item with an invalid quantity.",
            );
          }

          if (
            item.variant.status !== ProductStatus.ACTIVE ||
            item.variant.product.status !== ProductStatus.ACTIVE ||
            item.variant.product.deletedAt !== null
          ) {
            throw new ConflictError("This product is no longer available.");
          }
        }

        const currencies = new Set(
          cart.items.map((item) => item.variant.product.currency),
        );

        if (currencies.size !== 1) {
          throw new ConflictError("The cart contains items with mixed currencies.");
        }

        const conversion = await transaction.cart.updateMany({
          where: { id: cart.id, status: CartStatus.ACTIVE },
          data: { status: CartStatus.CONVERTED },
        });

        if (conversion.count !== 1) {
          throw new ConflictError("The cart can no longer be converted into an order.");
        }

        const orderItems = cart.items.map((item) => {
          const unitPrice = item.variant.priceOverride ?? item.variant.product.basePrice;

          return {
            variantId: item.variant.id,
            quantity: item.quantity,
            unitPrice,
            discountAmount: new Prisma.Decimal(0),
          };
        });

        const subtotalAmount = orderItems.reduce(
          (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
          new Prisma.Decimal(0),
        );

        const order = await transaction.order.create({
          data: {
            orderNumber: generateOrderNumber(new Date()),
            customerProfileId: profile.id,
            status: OrderStatus.DRAFT,
            subtotalAmount,
            totalAmount: subtotalAmount,
            currency: cart.items[0].variant.product.currency,
            items: { create: orderItems },
            payments: {
              create: [
                {
                  status: PaymentStatus.PENDING,
                  amount: subtotalAmount,
                  currency: cart.items[0].variant.product.currency,
                },
              ],
            },
          },
          select: orderSelection,
        });

        await createNotification(transaction, {
          accountId: account.id,
          type: NotificationType.ORDER,
          title: `Order ${order.orderNumber} created`,
          body: "Your order is waiting for the payment outcome.",
          entityType: "Order",
          entityId: order.id,
        });

        return mapOrder(order);
      }),
    ),
  );
}
