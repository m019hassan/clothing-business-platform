import "server-only";

import {
  AccountType,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { hasPermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  consumeStock,
  releaseStock,
  ReservationConflictError,
} from "@/modules/inventory/application/reservations";
import { ensureDeliveryForOrder } from "@/modules/delivery/application/deliveries";
import { createNotification } from "@/modules/notification/application/notifications";
import { mapOrder, orderSelection } from "@/modules/order/application/orders";
import type {
  PaymentOutcome,
  PaymentSimulationResult,
  PaymentView,
  PendingPaymentPage,
  PendingPaymentRow,
} from "@/modules/payment/types";
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

const paymentSelection = {
  id: true,
  orderId: true,
  status: true,
  amount: true,
  currency: true,
  method: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

type PaymentRecord = Prisma.PaymentGetPayload<{ select: typeof paymentSelection }>;

function mapPayment(payment: PaymentRecord): PaymentView {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    amount: payment.amount.toString(),
    currency: payment.currency,
    method: payment.method,
    createdAt: payment.createdAt.toISOString(),
  };
}

function isPaymentOutcome(value: unknown): value is PaymentOutcome {
  return value === "success" || value === "failure";
}

async function runPaymentTransaction<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      try {
        return await operation();
      } catch (retryError) {
        if (retryError instanceof ReservationConflictError) {
          throw new ConflictError("Stock changed while processing the payment. Please retry.");
        }

        throw retryError;
      }
    }

    throw error;
  }
}

const pendingPaymentWhere = {
  status: OrderStatus.PENDING_PAYMENT,
  payments: { some: { status: PaymentStatus.PENDING } },
} satisfies Prisma.OrderWhereInput;

/**
 * Read-only queue of orders waiting for a payment outcome, for staff with
 * payments.view. Uses the existing order/payment models; no new API.
 */
export async function listPendingPayments(
  pagination: Pagination,
): Promise<PendingPaymentPage> {
  return withDatabaseError(async () => {
    const [records, total] = await Promise.all([
      prisma.order.findMany({
        where: pendingPaymentWhere,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: pagination.limit,
        skip: pagination.offset,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          _count: { select: { items: true } },
          customerProfile: {
            select: {
              firstName: true,
              lastName: true,
              customerCode: true,
              account: { select: { email: true, phone: true } },
            },
          },
          payments: {
            where: { status: PaymentStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true, amount: true, method: true },
          },
        },
      }),
      prisma.order.count({ where: pendingPaymentWhere }),
    ]);

    const rows: PendingPaymentRow[] = records.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      itemCount: order._count.items,
      customerName: [order.customerProfile.firstName, order.customerProfile.lastName]
        .filter(Boolean)
        .join(" "),
      customerCode: order.customerProfile.customerCode,
      customerContact: order.customerProfile.account.email ?? order.customerProfile.account.phone,
      paymentStatus: order.payments[0]?.status ?? PaymentStatus.PENDING,
      paymentMethod: order.payments[0]?.method ?? null,
      paymentAmount: order.payments[0]?.amount.toString() ?? order.totalAmount.toString(),
    }));

    return {
      rows,
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

/**
 * Simulates an external payment outcome for lifecycle testing.
 * This is an internal application simulation, not an integration with a real
 * payment provider; the documented verification flow (proof upload plus staff
 * payments.verify / payments.reject) replaces it in a later slice.
 */
export async function simulatePaymentOutcome(
  account: AuthenticatedAccount,
  orderId: string,
  outcomeValue: unknown,
): Promise<PaymentSimulationResult> {
  if (!isUuid(orderId)) {
    throw new NotFoundError("Order not found.");
  }

  if (!isPaymentOutcome(outcomeValue)) {
    throw new ValidationError('The payment outcome must be "success" or "failure".');
  }

  const outcome = outcomeValue;
  const customerProfile = account.customerProfile;

  if (account.accountType !== AccountType.CUSTOMER && account.accountType !== AccountType.EMPLOYEE) {
    throw new AuthorizationError("A customer or employee account is required.");
  }

  let ownerFilter: Prisma.OrderWhereInput = {};

  if (account.accountType === AccountType.CUSTOMER) {
    if (!customerProfile) {
      throw new AuthorizationError("A customer account is required.");
    }

    ownerFilter = { customerProfileId: customerProfile.id };
  } else if (!(await hasPermission(PERMISSIONS.PAYMENTS_VERIFY))) {
    throw new AuthorizationError("You do not have permission to process payments.");
  }

  return withDatabaseError(() =>
    runPaymentTransaction(() =>
      prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id: orderId, ...ownerFilter },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            items: { select: { variantId: true, quantity: true } },
            customerProfile: { select: { accountId: true } },
          },
        });

        if (!order) {
          throw new NotFoundError("Order not found.");
        }

        if (order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new ConflictError("The order is not awaiting payment.");
        }

        const payment = await transaction.payment.findFirst({
          where: { orderId, status: PaymentStatus.PENDING },
          orderBy: { createdAt: "desc" },
          select: paymentSelection,
        });

        if (!payment) {
          throw new ConflictError("No pending payment was found for this order.");
        }

        const targetStatus =
          outcome === "success" ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

        const transition = await transaction.order.updateMany({
          where: { id: orderId, status: OrderStatus.PENDING_PAYMENT, ...ownerFilter },
          data: { status: targetStatus },
        });

        if (transition.count !== 1) {
          throw new ConflictError(
            "The order status changed while the request was processed. Please retry.",
          );
        }

        if (outcome === "success") {
          // A confirmed order always gets a fulfilment record.
          await ensureDeliveryForOrder(transaction, order.id);
        }

        for (const item of order.items) {
          if (outcome === "success") {
            await consumeStock(transaction, item.variantId, item.quantity, {
              orderId: order.id,
              actorAccountId: account.id,
              reason: "Payment approved",
            });
          } else {
            await releaseStock(transaction, item.variantId, item.quantity, {
              orderId: order.id,
              actorAccountId: account.id,
              reason: "Payment rejected",
            });
          }
        }

        const updatedPayment = await transaction.payment.update({
          where: { id: payment.id },
          data: {
            status: outcome === "success" ? PaymentStatus.APPROVED : PaymentStatus.REJECTED,
          },
          select: paymentSelection,
        });

        await createNotification(transaction, {
          accountId: order.customerProfile.accountId,
          type: NotificationType.PAYMENT,
          title:
            outcome === "success"
              ? `Payment approved for ${order.orderNumber}`
              : `Payment rejected for ${order.orderNumber}`,
          body:
            outcome === "success"
              ? "Your order is confirmed and stock has been reserved for shipment."
              : "The payment was not completed and the order was cancelled.",
          entityType: "Order",
          entityId: order.id,
        });

        const updatedOrder = await transaction.order.findFirst({
          where: { id: orderId, ...ownerFilter },
          select: orderSelection,
        });

        if (!updatedOrder) {
          throw new NotFoundError("Order not found.");
        }

        return { order: mapOrder(updatedOrder), payment: mapPayment(updatedPayment) };
      }),
    ),
  );
}
