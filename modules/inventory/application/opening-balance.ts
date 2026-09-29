import "server-only";

import type { Prisma } from "@prisma/client";

import { recordMovement } from "@/modules/inventory/application/ledger";

/**
 * Records the first stock of a variant inside the caller's transaction: the balance
 * row is created (or topped up) and the change lands in the ledger as an ADJUSTMENT,
 * so opening stock is never a number without a movement behind it.
 */
export async function applyOpeningBalance(
  transaction: Prisma.TransactionClient,
  input: {
    variantId: string;
    warehouseId: string;
    quantity: number;
    reason: string;
    actorAccountId?: string;
  },
): Promise<void> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return;
  }

  const existing = await transaction.inventoryItem.findFirst({
    where: { variantId: input.variantId, warehouseId: input.warehouseId },
    select: { id: true, quantityOnHand: true, quantityReserved: true },
  });

  const onHandBefore = existing?.quantityOnHand ?? 0;
  const reserved = existing?.quantityReserved ?? 0;
  const onHandAfter = onHandBefore + input.quantity;

  if (existing) {
    await transaction.inventoryItem.update({
      where: { id: existing.id },
      data: { quantityOnHand: { increment: input.quantity } },
    });
  } else {
    await transaction.inventoryItem.create({
      data: {
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        quantityOnHand: input.quantity,
        quantityReserved: 0,
      },
    });
  }

  await recordMovement(transaction, {
    variantId: input.variantId,
    warehouseId: input.warehouseId,
    type: "ADJUSTMENT",
    quantityChange: input.quantity,
    quantityOnHandAfter: onHandAfter,
    quantityReservedAfter: reserved,
    context: { actorAccountId: input.actorAccountId, reason: input.reason },
  });
}
