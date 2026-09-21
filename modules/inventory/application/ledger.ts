import "server-only";

import type { Prisma, StockMovementType } from "@prisma/client";

export type MovementContext = {
  actorAccountId?: string;
  orderId?: string;
  reason?: string;
};

/**
 * Appends one row to the stock ledger inside the caller's transaction, so a
 * movement can never be recorded without the balance change it documents.
 *
 * `quantityChange` is the signed change of on-hand stock; reserved stock is
 * captured through `quantityReservedAfter` (a reservation keeps on-hand intact).
 */
export async function recordMovement(
  transaction: Prisma.TransactionClient,
  input: {
    variantId: string;
    warehouseId: string;
    type: StockMovementType;
    quantityChange: number;
    quantityOnHandAfter: number;
    quantityReservedAfter: number;
    context?: MovementContext;
  },
): Promise<void> {
  await transaction.stockMovement.create({
    data: {
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      type: input.type,
      quantityChange: input.quantityChange,
      quantityOnHandAfter: input.quantityOnHandAfter,
      quantityReservedAfter: input.quantityReservedAfter,
      reason: input.context?.reason ?? null,
      actorAccountId: input.context?.actorAccountId ?? null,
      orderId: input.context?.orderId ?? null,
    },
  });
}
