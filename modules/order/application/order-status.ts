import "server-only";

import { AccountType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { releaseStock } from "@/modules/inventory/application/reservations";
import { mapOrder, orderSelection } from "@/modules/order/application/orders";
import type { OrderView } from "@/modules/order/types";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const CUSTOMER_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const CUSTOMER_ALLOWED_TARGETS: readonly OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CANCELLED,
];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.READY_TO_SHIP],
  [OrderStatus.READY_TO_SHIP]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (Object.values(OrderStatus) as string[]).includes(value)
  );
}

function isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

async function applyTransition(
  orderId: string,
  expectedStatus: OrderStatus,
  targetStatus: OrderStatus,
  ownerFilter: Prisma.OrderWhereInput,
): Promise<OrderView> {
  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      // The guarded status update is the single-release guarantee: it can only
      // succeed once per order, so the cancellation release below runs at most once.
      const result = await transaction.order.updateMany({
        where: { id: orderId, status: expectedStatus, ...ownerFilter },
        data: { status: targetStatus },
      });

      if (result.count !== 1) {
        throw new ConflictError(
          "The order status changed while the request was processed. Please retry.",
        );
      }

      if (targetStatus === OrderStatus.CANCELLED) {
        const items = await transaction.orderItem.findMany({
          where: { orderId },
          select: { variantId: true, quantity: true },
        });

        for (const item of items) {
          await releaseStock(transaction, item.variantId, item.quantity);
        }

        await transaction.payment.updateMany({
          where: { orderId, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });
      }

      const order = await transaction.order.findFirst({
        where: { id: orderId, ...ownerFilter },
        select: orderSelection,
      });

      if (!order) {
        throw new NotFoundError("Order not found.");
      }

      return mapOrder(order);
    }),
  );
}

export async function updateOrderStatus(
  account: AuthenticatedAccount,
  orderId: string,
  targetStatusValue: unknown,
): Promise<OrderView> {
  if (!isUuid(orderId)) {
    throw new NotFoundError("Order not found.");
  }

  if (!isOrderStatus(targetStatusValue)) {
    throw new ValidationError("A valid order status is required.");
  }

  const targetStatus = targetStatusValue;

  if (account.accountType === AccountType.CUSTOMER && account.customerProfile) {
    const profileId = account.customerProfile.id;

    const order = await withDatabaseError(() =>
      prisma.order.findFirst({
        where: { id: orderId, customerProfileId: profileId },
        select: { id: true, status: true, createdAt: true },
      }),
    );

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    if (!CUSTOMER_ALLOWED_TARGETS.includes(targetStatus)) {
      throw new ConflictError("This status transition is not permitted.");
    }

    if (!isTransitionAllowed(order.status, targetStatus)) {
      throw new ConflictError(
        "This status transition is not permitted from the order's current status.",
      );
    }

    if (
      targetStatus === OrderStatus.CANCELLED &&
      Date.now() - order.createdAt.getTime() > CUSTOMER_CANCELLATION_WINDOW_MS
    ) {
      throw new ConflictError(
        "Orders can only be cancelled within 24 hours of placement.",
      );
    }

    return applyTransition(order.id, order.status, targetStatus, {
      customerProfileId: profileId,
    });
  }

  if (account.accountType === AccountType.EMPLOYEE) {
    if (targetStatus !== OrderStatus.CANCELLED) {
      throw new AuthorizationError(
        "No permission is defined for this order status transition.",
      );
    }

    await requirePermission(PERMISSIONS.ORDERS_CANCEL);

    const order = await withDatabaseError(() =>
      prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, status: true },
      }),
    );

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    if (!isTransitionAllowed(order.status, targetStatus)) {
      throw new ConflictError(
        "The order cannot be cancelled from its current status.",
      );
    }

    return applyTransition(order.id, order.status, targetStatus, {});
  }

  throw new AuthorizationError("A customer or employee account is required.");
}
