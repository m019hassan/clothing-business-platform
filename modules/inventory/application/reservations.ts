import "server-only";

import { Prisma } from "@prisma/client";

import { recordMovement, type MovementContext } from "@/modules/inventory/application/ledger";
import { ConflictError } from "@/src/lib/errors";

export type TransactionClient = Prisma.TransactionClient;

export class ReservationConflictError extends Error {}

/**
 * How many times a guarded stock write re-reads state before giving up. Two
 * terminals can legitimately contend for the same row; the guard is what keeps the
 * ceiling, the retry is what keeps an honest request from failing because of it.
 */
const STOCK_ATTEMPTS = 3;

export async function reserveStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
  context?: MovementContext,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  let pending = quantity;

  // Optimistic concurrency: the guarded update below fails when another
  // transaction changed the row after we read it, even when the stock is still
  // there. Re-reading and retrying keeps a legitimate request from failing just
  // because it lost a race, while the guard itself still guarantees the ceiling.
  for (let attempt = 1; attempt <= STOCK_ATTEMPTS && pending > 0; attempt += 1) {
    const rows = await transaction.inventoryItem.findMany({
      where: { variantId },
      select: { id: true, warehouseId: true, quantityOnHand: true, quantityReserved: true },
      orderBy: { quantityOnHand: "desc" },
    });

    const available = rows.reduce(
      (sum, row) => sum + row.quantityOnHand - row.quantityReserved,
      0,
    );

    if (available < pending) {
      // Nothing left to win: this is a genuine shortage, not a lost race. Units
      // reserved by an earlier attempt of this same request stay reserved.
      throw new ConflictError("Insufficient stock for the requested quantity.");
    }

    for (const row of rows) {
      if (pending <= 0) {
        break;
      }

      const headroom = row.quantityOnHand - row.quantityReserved;

      if (headroom <= 0) {
        continue;
      }

      const amount = Math.min(headroom, pending);

      const result = await transaction.inventoryItem.updateMany({
        where: {
          id: row.id,
          quantityReserved: row.quantityReserved,
          quantityOnHand: { gte: row.quantityReserved + amount },
        },
        data: { quantityReserved: { increment: amount } },
      });

      if (result.count === 0) {
        // Lost the race for this row; start the next attempt from fresh state.
        break;
      }

      await recordMovement(transaction, {
        variantId,
        warehouseId: row.warehouseId,
        type: "RESERVATION",
        quantityChange: 0,
        quantityOnHandAfter: row.quantityOnHand,
        quantityReservedAfter: row.quantityReserved + amount,
        context,
      });

      pending -= amount;
    }
  }

  if (pending > 0) {
    throw new ReservationConflictError("Reservation state changed concurrently. Please retry.");
  }
}

export async function releaseStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
  context?: MovementContext,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId, quantityReserved: { gt: 0 } },
    select: { id: true, warehouseId: true, quantityOnHand: true, quantityReserved: true },
    orderBy: { quantityReserved: "desc" },
  });

  const reservedTotal = rows.reduce((sum, row) => sum + row.quantityReserved, 0);

  if (reservedTotal < quantity) {
    throw new ConflictError("Unable to release more stock than reserved.");
  }

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }

    const amount = Math.min(row.quantityReserved, remaining);

    const result = await transaction.inventoryItem.updateMany({
      where: { id: row.id, quantityReserved: { gte: amount } },
      data: { quantityReserved: { decrement: amount } },
    });

    if (result.count === 0) {
      throw new ReservationConflictError("Reservation state changed concurrently.");
    }

    await recordMovement(transaction, {
      variantId,
      warehouseId: row.warehouseId,
      type: "RELEASE",
      quantityChange: 0,
      quantityOnHandAfter: row.quantityOnHand,
      quantityReservedAfter: row.quantityReserved - amount,
      context,
    });

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new ReservationConflictError("Reservation state changed concurrently.");
  }
}

export async function consumeStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
  context?: MovementContext,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId },
    select: { id: true, warehouseId: true, quantityOnHand: true, quantityReserved: true },
    orderBy: { quantityReserved: "desc" },
  });

  const reservedTotal = rows.reduce((sum, row) => sum + row.quantityReserved, 0);

  if (reservedTotal < quantity) {
    throw new ConflictError("The reserved stock for this item is no longer available.");
  }

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }

    if (row.quantityReserved <= 0) {
      continue;
    }

    const amount = Math.min(row.quantityReserved, remaining);

    const result = await transaction.inventoryItem.updateMany({
      where: {
        id: row.id,
        quantityOnHand: { gte: amount },
        quantityReserved: { gte: amount },
      },
      data: {
        quantityOnHand: { decrement: amount },
        quantityReserved: { decrement: amount },
      },
    });

    if (result.count === 0) {
      throw new ReservationConflictError("Stock state changed concurrently.");
    }

    await recordMovement(transaction, {
      variantId,
      warehouseId: row.warehouseId,
      type: "CONSUMPTION",
      quantityChange: -amount,
      quantityOnHandAfter: row.quantityOnHand - amount,
      quantityReservedAfter: row.quantityReserved - amount,
      context,
    });

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new ReservationConflictError("Stock state changed concurrently.");
  }
}

/**
 * Sells stock directly (point of sale): on-hand is decremented from the given
 * warehouses without touching reservations, and a CONSUMPTION movement is written.
 */
export async function sellStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
  options: { warehouseIds?: string[]; context?: MovementContext } = {},
): Promise<number> {
  if (quantity <= 0) {
    return 0;
  }

  const where = {
    variantId,
    ...(options.warehouseIds && options.warehouseIds.length > 0
      ? { warehouseId: { in: options.warehouseIds } }
      : {}),
  };

  let pending = quantity;

  for (let attempt = 1; attempt <= STOCK_ATTEMPTS && pending > 0; attempt += 1) {
    const rows = await transaction.inventoryItem.findMany({
      where,
      select: { id: true, warehouseId: true, quantityOnHand: true, quantityReserved: true },
      orderBy: { quantityOnHand: "desc" },
    });

    const available = rows.reduce((sum, row) => sum + row.quantityOnHand - row.quantityReserved, 0);

    if (available < pending) {
      throw new ConflictError("Insufficient stock for this sale.");
    }

    for (const row of rows) {
      if (pending <= 0) {
        break;
      }

      const sellable = row.quantityOnHand - row.quantityReserved;

      if (sellable <= 0) {
        continue;
      }

      const amount = Math.min(sellable, pending);

      const result = await transaction.inventoryItem.updateMany({
        // Both counters are compared: a concurrent reservation changes
        // quantityReserved without touching quantityOnHand, and selling against a
        // stale reservation count could push on-hand below the reserved amount.
        where: {
          id: row.id,
          quantityOnHand: row.quantityOnHand,
          quantityReserved: row.quantityReserved,
        },
        data: { quantityOnHand: { decrement: amount } },
      });

      if (result.count === 0) {
        break;
      }

      await recordMovement(transaction, {
        variantId,
        warehouseId: row.warehouseId,
        type: "CONSUMPTION",
        quantityChange: -amount,
        quantityOnHandAfter: row.quantityOnHand - amount,
        quantityReservedAfter: row.quantityReserved,
        context: options.context,
      });

      pending -= amount;
    }
  }

  if (pending > 0) {
    throw new ReservationConflictError("Stock state changed concurrently. Please retry.");
  }

  return quantity;
}
