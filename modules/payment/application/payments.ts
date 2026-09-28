import "server-only";

import {
  AccountType,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { hasPermission, requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  consumeStock,
  releaseStock,
  ReservationConflictError,
} from "@/modules/inventory/application/reservations";
import { ensureDeliveryForOrder } from "@/modules/delivery/application/deliveries";
import { notifyBranchPermissionHolders } from "@/modules/notification/application/branch-notifications";
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

const SETTLABLE_PAYMENT_STATUSES = [PaymentStatus.PENDING, PaymentStatus.PENDING_VERIFICATION];

const pendingPaymentWhere = {
  status: OrderStatus.PENDING_PAYMENT,
  payments: { some: { status: { in: SETTLABLE_PAYMENT_STATUSES } } },
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
            where: { status: { in: SETTLABLE_PAYMENT_STATUSES } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              amount: true,
              method: true,
              _count: { select: { proofs: true } },
            },
          },
        },
      }),
      prisma.order.count({ where: pendingPaymentWhere }),
    ]);

    const rows: PendingPaymentRow[] = records
      .filter((order) => order.payments[0] !== undefined)
      .map((order) => ({
      orderId: order.id,
      paymentId: order.payments[0].id,
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
      paymentStatus: order.payments[0].status,
      paymentMethod: order.payments[0].method,
      paymentAmount: order.payments[0].amount.toString(),
      hasProof: (order.payments[0]._count?.proofs ?? 0) > 0,
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
 * payment provider: the staff flow (recordPaymentVerification / approvePayment /
 * rejectPayment, exposed under /api/payments) is the real path. Receipt upload is
 * still pending a storage decision, so the simulation stays available for local
 * lifecycle testing.
 */
/**
 * Shared payment outcome path: both the development simulation and the staff
 * verification endpoints move an order through it, so stock, delivery, the audit
 * trail and the customer notification can never drift between the two.
 */
async function applyPaymentOutcome(
  account: AuthenticatedAccount,
  orderId: string,
  outcome: PaymentOutcome,
  ownerFilter: Prisma.OrderWhereInput = {},
): Promise<PaymentSimulationResult> {
  return withDatabaseError(() =>
    runPaymentTransaction(() =>
      prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findFirst({
          where: { id: orderId, ...ownerFilter },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            branchId: true,
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
          // A transfer waiting for verification is still settleable.
          where: { orderId, status: { in: [PaymentStatus.PENDING, PaymentStatus.PENDING_VERIFICATION] } },
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

          if (order.branchId) {
            await notifyBranchPermissionHolders(transaction, {
              branchId: order.branchId,
              permission: "shipping.manage",
              type: "ORDER",
              title: `New order to fulfil: ${order.orderNumber}`,
              body: "Open the deliveries screen to start processing it.",
              entityType: "Order",
              entityId: order.id,
              excludeAccountId: account.id,
            });
          }
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

        await transaction.auditLog.create({
          data: {
            accountId: account.id,
            action: outcome === "success" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
            entity: "Order",
            entityId: order.id,
            newValue: updatedPayment.status,
          },
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

/** Development helper: the customer (or a verifier) records the outcome directly. */
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

  if (account.accountType !== AccountType.CUSTOMER && account.accountType !== AccountType.EMPLOYEE) {
    throw new AuthorizationError("A customer or employee account is required.");
  }

  let ownerFilter: Prisma.OrderWhereInput = {};

  if (account.accountType === AccountType.CUSTOMER) {
    if (!account.customerProfile) {
      throw new AuthorizationError("A customer account is required.");
    }

    ownerFilter = { customerProfileId: account.customerProfile.id };
  } else if (!(await hasPermission(PERMISSIONS.PAYMENTS_VERIFY))) {
    throw new AuthorizationError("You do not have permission to process payments.");
  }

  return applyPaymentOutcome(account, orderId, outcomeValue, ownerFilter);
}

async function paymentOrderId(paymentId: string): Promise<string> {
  if (!isUuid(paymentId)) {
    throw new NotFoundError("Payment not found.");
  }

  const payment = await withDatabaseError(() =>
    prisma.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } }),
  );

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  return payment.orderId;
}

/**
 * Records that a transfer was received and checked (payments.verify): the payment
 * moves to PENDING_VERIFICATION and still needs an approval decision.
 */
export async function recordPaymentVerification(
  account: AuthenticatedAccount,
  paymentId: string,
): Promise<PaymentView> {
  await requirePermission(PERMISSIONS.PAYMENTS_VERIFY);

  if (!isUuid(paymentId)) {
    throw new NotFoundError("Payment not found.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, order: { select: { id: true, status: true } } },
      });

      if (!payment) {
        throw new NotFoundError("Payment not found.");
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictError(`Only a pending payment can be verified (this one is ${payment.status}).`);
      }

      if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ConflictError("The order is not awaiting payment.");
      }

      const updated = await transaction.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PENDING_VERIFICATION },
        select: paymentSelection,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PAYMENT_VERIFIED",
          entity: "Payment",
          entityId: paymentId,
          newValue: PaymentStatus.PENDING_VERIFICATION,
        },
      });

      return mapPayment(updated);
    }),
  );
}

/** Approves a payment (payments.approve): confirms the order and consumes stock. */
export async function approvePayment(
  account: AuthenticatedAccount,
  paymentId: string,
): Promise<PaymentSimulationResult> {
  await requirePermission(PERMISSIONS.PAYMENTS_APPROVE);
  const orderId = await paymentOrderId(paymentId);

  return applyPaymentOutcome(account, orderId, "success");
}

/** Rejects a payment (payments.reject): cancels the order and releases stock. */
export async function rejectPayment(
  account: AuthenticatedAccount,
  paymentId: string,
): Promise<PaymentSimulationResult> {
  await requirePermission(PERMISSIONS.PAYMENTS_REJECT);
  const orderId = await paymentOrderId(paymentId);

  return applyPaymentOutcome(account, orderId, "failure");
}
