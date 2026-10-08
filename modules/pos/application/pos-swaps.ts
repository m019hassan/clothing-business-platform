import "server-only";

import { OrderChannel, OrderStatus, SwapStage } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { requireDistributor, resolveWarehouseIds } from "@/modules/pos/application/pos-sales";
import { restockReturnedLine } from "@/modules/pos/application/pos-returns";
import { prisma } from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

/** The stages in the order a swap may only ever move forward through. */
const STAGE_ORDER: SwapStage[] = [
  SwapStage.REQUESTED,
  SwapStage.UNDER_REVIEW,
  SwapStage.APPROVED,
  SwapStage.SHIPPED,
  SwapStage.RECEIVED,
];

export type SwapStageValue = (typeof STAGE_ORDER)[number];

export function parseSwapStage(payload: unknown): SwapStageValue {
  if (typeof payload !== "string" || !STAGE_ORDER.includes(payload as SwapStage)) {
    throw new ValidationError(`stage must be one of: ${STAGE_ORDER.join(", ")}.`);
  }

  return payload as SwapStageValue;
}

export type SwapRequestInput = { orderItemId: string; quantity: number; reason: string | null };

/** Validates the swap payload: one sale line, a quantity, and an optional reason. */
export function parseSwapInput(payload: unknown): SwapRequestInput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => key !== "orderItemId" && key !== "quantity" && key !== "reason");

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (typeof body.orderItemId !== "string" || !isUuid(body.orderItemId)) {
    throw new ValidationError("A swap needs the orderItemId it replaces.");
  }

  const quantity = typeof body.quantity === "number" ? body.quantity : Number(body.quantity);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
    throw new ValidationError("quantity must be a whole number between 1 and 999.");
  }

  let reason: string | null = null;

  if (typeof body.reason === "string" && body.reason.trim() !== "") {
    reason = body.reason.trim();

    if (reason.length > 300) {
      throw new ValidationError("reason must hold at most 300 characters.");
    }
  }

  return { orderItemId: body.orderItemId, quantity, reason };
}

export type PosSwapView = {
  id: string;
  orderItemId: string;
  sku: string;
  productName: string;
  quantity: number;
  stage: SwapStage;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  restockedAt: string | null;
};

function toSwapView(swap: {
  id: string;
  orderItemId: string;
  quantity: number;
  stage: SwapStage;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
  restockedAt: Date | null;
  orderItem: { variant: { sku: string; product: { name: string } } };
}): PosSwapView {
  return {
    id: swap.id,
    orderItemId: swap.orderItemId,
    sku: swap.orderItem.variant.sku,
    productName: swap.orderItem.variant.product.name,
    quantity: swap.quantity,
    stage: swap.stage,
    reason: swap.reason,
    createdAt: swap.createdAt.toISOString(),
    updatedAt: swap.updatedAt.toISOString(),
    restockedAt: swap.restockedAt ? swap.restockedAt.toISOString() : null,
  };
}

/**
 * Opens a swap request on a counter sale: the customer hands back units of one
 * line and will take a replacement instead. Nothing touches stock or money yet —
 * the returned units come back to the branch warehouse when the request is approved.
 */
export async function requestPosSwap(
  account: AuthenticatedAccount,
  orderId: string,
  payload: unknown,
): Promise<PosSwapView> {
  const distributor = requireDistributor(account);
  const input = parseSwapInput(payload);

  if (!isUuid(orderId)) {
    throw new NotFoundError("The sale was not found.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: orderId, channel: OrderChannel.POS },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          branchId: true,
          items: {
            where: { id: input.orderItemId },
            select: {
              id: true,
              quantity: true,
              returnedQuantity: true,
              variant: { select: { sku: true } },
            },
          },
        },
      });

      if (!order || order.branchId !== distributor.branchId) {
        throw new NotFoundError("The sale was not found.");
      }

      if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.RETURNED) {
        throw new ConflictError("Only a completed counter sale can be exchanged.");
      }

      const item = order.items[0];

      if (!item) {
        throw new NotFoundError("The line does not belong to this sale.");
      }

      const swapped = await transaction.swapRequest.aggregate({
        where: { orderItemId: item.id },
        _sum: { quantity: true },
      });
      const remaining = item.quantity - item.returnedQuantity - (swapped._sum.quantity ?? 0);

      if (input.quantity > remaining) {
        throw new ConflictError(
          `Only ${remaining} unit(s) of ${item.variant.sku} can still be swapped.`,
        );
      }

      const swap = await transaction.swapRequest.create({
        data: {
          orderId: order.id,
          orderItemId: item.id,
          branchId: distributor.branchId,
          quantity: input.quantity,
          reason: input.reason,
        },
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          stage: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          restockedAt: true,
          orderItem: { select: { variant: { select: { sku: true, product: { select: { name: true } } } } } },
        },
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "SWAP_REQUESTED",
          entity: "SwapRequest",
          entityId: swap.id,
          newValue: `${input.quantity} x ${item.variant.sku} on ${order.orderNumber}`,
        },
      });

      return toSwapView(swap);
    }),
  );
}

/**
 * Moves a swap request to a later stage, never back. Reaching approval (or any
 * stage past it) returns the units to the branch warehouse in the same
 * transaction, so the ledger and the stock balance cannot drift apart.
 */
export async function advancePosSwap(
  account: AuthenticatedAccount,
  swapId: string,
  stage: SwapStageValue,
): Promise<PosSwapView> {
  const distributor = requireDistributor(account);

  if (!isUuid(swapId)) {
    throw new NotFoundError("The swap request was not found.");
  }

  const warehouseIds = await resolveWarehouseIds(distributor.branchId);

  if (warehouseIds.length === 0) {
    throw new ConflictError("The branch has no active warehouse to restock.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const swap = await transaction.swapRequest.findFirst({
        where: { id: swapId },
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          stage: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          restockedAt: true,
          branchId: true,
          orderItem: {
            select: {
              variantId: true,
              variant: { select: { sku: true, product: { select: { name: true } } } },
            },
          },
          order: { select: { orderNumber: true, branchId: true } },
        },
      });

      const branchId = swap?.branchId ?? swap?.order.branchId;

      if (!swap || branchId !== distributor.branchId) {
        throw new NotFoundError("The swap request was not found.");
      }

      const fromIndex = STAGE_ORDER.indexOf(swap.stage);
      const toIndex = STAGE_ORDER.indexOf(stage);

      if (toIndex <= fromIndex) {
        throw new ConflictError("A swap request can only move forward.");
      }

      let restockedAt = swap.restockedAt;

      const approvalIndex = STAGE_ORDER.indexOf(SwapStage.APPROVED);

      if (toIndex >= approvalIndex && !restockedAt) {
        await restockReturnedLine(transaction, swap.orderItem.variantId, warehouseIds[0], swap.quantity, {
          actorAccountId: account.id,
          reason: `استبدال على ${swap.order.orderNumber}`,
        });

        restockedAt = new Date();
      }

      const updated = await transaction.swapRequest.update({
        where: { id: swap.id },
        data: { stage, restockedAt },
        select: {
          id: true,
          orderItemId: true,
          quantity: true,
          stage: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          restockedAt: true,
          orderItem: { select: { variant: { select: { sku: true, product: { select: { name: true } } } } } },
        },
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "SWAP_STAGE_CHANGED",
          entity: "SwapRequest",
          entityId: swap.id,
          newValue: `${swap.stage} → ${stage}${restockedAt && !swap.restockedAt ? " (restocked)" : ""}`,
        },
      });

      return toSwapView(updated);
    }),
  );
}

/** Every swap request on one counter sale, oldest first. */
export async function listOrderSwaps(account: AuthenticatedAccount, orderId: string): Promise<PosSwapView[]> {
  const distributor = requireDistributor(account);

  if (!isUuid(orderId)) {
    throw new NotFoundError("The sale was not found.");
  }

  const swaps = await withDatabaseError(() =>
    prisma.swapRequest.findMany({
      where: { order: { id: orderId, channel: OrderChannel.POS, branchId: distributor.branchId } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderItemId: true,
        quantity: true,
        stage: true,
        reason: true,
        createdAt: true,
        updatedAt: true,
        restockedAt: true,
        orderItem: { select: { variant: { select: { sku: true, product: { select: { name: true } } } } } },
      },
    }),
  );

  return swaps.map(toSwapView);
}
