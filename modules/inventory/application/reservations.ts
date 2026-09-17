import "server-only";

import { Prisma } from "@prisma/client";

import { ConflictError } from "@/src/lib/errors";

export type TransactionClient = Prisma.TransactionClient;

export class ReservationConflictError extends Error {}

export async function reserveStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId },
    select: { id: true, quantityOnHand: true, quantityReserved: true },
    orderBy: { quantityOnHand: "desc" },
  });

  const available = rows.reduce(
    (sum, row) => sum + row.quantityOnHand - row.quantityReserved,
    0,
  );

  if (available < quantity) {
    throw new ConflictError("Insufficient stock for the requested quantity.");
  }

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) {
      break;
    }

    const headroom = row.quantityOnHand - row.quantityReserved;

    if (headroom <= 0) {
      continue;
    }

    const amount = Math.min(headroom, remaining);

    const result = await transaction.inventoryItem.updateMany({
      where: {
        id: row.id,
        quantityReserved: row.quantityReserved,
        quantityOnHand: { gte: row.quantityReserved + amount },
      },
      data: { quantityReserved: { increment: amount } },
    });

    if (result.count === 0) {
      throw new ReservationConflictError("Reservation state changed concurrently.");
    }

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new ReservationConflictError("Reservation state changed concurrently.");
  }
}

export async function releaseStock(
  transaction: TransactionClient,
  variantId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId, quantityReserved: { gt: 0 } },
    select: { id: true, quantityReserved: true },
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
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  const rows = await transaction.inventoryItem.findMany({
    where: { variantId },
    select: { id: true, quantityOnHand: true, quantityReserved: true },
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

    remaining -= amount;
  }

  if (remaining > 0) {
    throw new ReservationConflictError("Stock state changed concurrently.");
  }
}
