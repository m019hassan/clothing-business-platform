import "server-only";

import { NotificationType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createNotification } from "@/modules/notification/application/notifications";
import { mapOrder, orderSelection } from "@/modules/order/application/orders";
import type { OrderView } from "@/modules/order/types";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

import { prisma } from "@/src/lib/db";

const MAX_REASON = 500;

/** Orders whose payment was collected and can therefore be refunded. */
const REFUNDABLE_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export type RefundView = {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  reason: string | null;
  createdAt: string;
};

export type RefundInput = { reason?: string };

export function parseRefundInput(payload: unknown): RefundInput {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => key !== "reason");

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (body.reason === undefined) {
    return {};
  }

  if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
    throw new ValidationError("reason must be a non-empty string when provided.");
  }

  const reason = body.reason.trim();

  if (reason.length > MAX_REASON) {
    throw new ValidationError(`reason must be at most ${MAX_REASON} characters.`);
  }

  return { reason };
}

function mapRefund(refund: {
  id: string;
  orderId: string;
  amount: Prisma.Decimal;
  currency: string;
  reason: string | null;
  createdAt: Date;
}): RefundView {
  return {
    id: refund.id,
    orderId: refund.orderId,
    amount: refund.amount.toString(),
    currency: refund.currency,
    reason: refund.reason,
    createdAt: refund.createdAt.toISOString(),
  };
}

/** Refunds recorded against an order, newest first. */
export async function listOrderRefunds(orderId: string): Promise<RefundView[]> {
  if (!isUuid(orderId)) {
    throw new NotFoundError("Order not found.");
  }

  const refunds = await prisma.refund.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });

  return refunds.map(mapRefund);
}

/**
 * Records a refund for an order whose payment was collected.
 *
 * This is a financial event only: the money is returned and both the payment and
 * the order move to REFUNDED. Stock is not restocked here - a physical return is
 * inspected and recorded separately, which keeps this action from inventing
 * inventory that was never received back.
 */
export async function refundOrder(
  account: NonNullable<SafeAccount>,
  orderId: string,
  payload: unknown,
): Promise<{ order: OrderView; refund: RefundView }> {
  await requirePermission(PERMISSIONS.PAYMENTS_REFUND);

  if (!isUuid(orderId)) {
    throw new NotFoundError("Order not found.");
  }

  const input = parseRefundInput(payload);

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerProfile: { select: { accountId: true } },
        payments: {
          where: { status: PaymentStatus.APPROVED },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, amount: true, currency: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    if (!(REFUNDABLE_STATUSES as OrderStatus[]).includes(order.status)) {
      throw new ConflictError("Only a confirmed, shipped or delivered order can be refunded.");
    }

    const payment = order.payments[0];

    if (!payment) {
      throw new ConflictError("No approved payment was found for this order.");
    }

    const transition = await transaction.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: OrderStatus.REFUNDED },
    });

    if (transition.count !== 1) {
      throw new ConflictError("The order status changed while the request was processed. Please retry.");
    }

    const refund = await transaction.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        reason: input.reason ?? null,
        refundedByAccountId: account.id,
      },
    });

    await transaction.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });

    await transaction.auditLog.create({
      data: {
        accountId: account.id,
        action: "ORDER_REFUNDED",
        entity: "Order",
        entityId: orderId,
        newValue: OrderStatus.REFUNDED,
      },
    });

    await createNotification(transaction, {
      accountId: order.customerProfile.accountId,
      type: NotificationType.PAYMENT,
      title: `Refund recorded for ${order.orderNumber}`,
      body: `${payment.amount.toString()} ${payment.currency} is being returned to you.`,
      entityType: "Order",
      entityId: orderId,
    });

    const updated = await transaction.order.findUniqueOrThrow({
      where: { id: orderId },
      select: orderSelection,
    });

    return { order: mapOrder(updated), refund: mapRefund(refund) };
  });
}
