import "server-only";

import { OrderChannel, OrderStatus, Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { recordMovement } from "@/modules/inventory/application/ledger";
import { requireDistributor, resolveWarehouseIds } from "@/modules/pos/application/pos-sales";
import { prisma } from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type PosReturnLineInput = { orderItemId: string; quantity: number };

export type PosReturnResult = {
  orderId: string;
  orderNumber: string;
  status: string;
  refundedAmount: string;
  currency: string;
  returnedUnits: number;
  fullyReturned: boolean;
};

export type PosHistoryLine = {
  orderItemId: string;
  sku: string;
  productName: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: string;
};

export type PosHistoryRow = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalAmount: string;
  currency: string;
  refundedAmount: string;
  returnedUnits: number;
  soldUnits: number;
  lines: PosHistoryLine[];
};

/** Validates the return payload; unknown keys are rejected. */
export function parsePosReturnInput(payload: unknown): { lines: PosReturnLineInput[]; reason: string | null } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => key !== "lines" && key !== "reason");

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new ValidationError("lines must be a non-empty array.");
  }

  if (body.lines.length > 50) {
    throw new ValidationError("lines must hold at most 50 entries.");
  }

  const merged = new Map<string, number>();

  for (const entry of body.lines) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ValidationError("Each line must be an object.");
    }

    const line = entry as Record<string, unknown>;
    const extra = Object.keys(line).filter((key) => key !== "orderItemId" && key !== "quantity");

    if (extra.length > 0) {
      throw new ValidationError(`Unknown field(s) on a line: ${extra.join(", ")}.`);
    }

    if (typeof line.orderItemId !== "string" || !isUuid(line.orderItemId)) {
      throw new ValidationError("Each line needs an orderItemId.");
    }

    const quantity = typeof line.quantity === "number" ? line.quantity : Number(line.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new ValidationError("Each line quantity must be a whole number between 1 and 999.");
    }

    merged.set(line.orderItemId, (merged.get(line.orderItemId) ?? 0) + quantity);
  }

  const reason = typeof body.reason === "string" && body.reason.trim() !== "" ? body.reason.trim() : null;

  return { lines: [...merged.entries()].map(([orderItemId, quantity]) => ({ orderItemId, quantity })), reason };
}

type ReturnContext = {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    channel: OrderChannel;
    branchId: string | null;
    currency: string;
    paymentId: string | null;
    items: {
      id: string;
      variantId: string;
      quantity: number;
      returnedQuantity: number;
      unitPrice: Prisma.Decimal;
      variant: { sku: string; product: { name: string } };
    }[];
  };
};

async function loadSaleForReturn(
  transaction: Prisma.TransactionClient,
  orderId: string,
  branchId: string,
): Promise<ReturnContext["order"]> {
  if (!isUuid(orderId)) {
    throw new NotFoundError("The sale was not found.");
  }

  const order = await transaction.order.findFirst({
    where: { id: orderId, channel: OrderChannel.POS },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      channel: true,
      branchId: true,
      currency: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          variantId: true,
          quantity: true,
          returnedQuantity: true,
          unitPrice: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
      payments: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
    },
  });

  if (!order || order.branchId !== branchId) {
    throw new NotFoundError("The sale was not found.");
  }

  if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.RETURNED) {
    throw new ConflictError("Only a completed counter sale can be returned.");
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    channel: order.channel,
    branchId: order.branchId,
    currency: order.currency,
    paymentId: order.payments[0]?.id ?? null,
    items: order.items,
  };
}

/** Adds stock back to the branch for a returned line and writes the ledger entry. */
async function restockReturnedLine(
  transaction: Prisma.TransactionClient,
  variantId: string,
  warehouseId: string,
  quantity: number,
  context: { actorAccountId: string; reason: string },
): Promise<void> {
  const existing = await transaction.inventoryItem.findUnique({
    where: { variantId_warehouseId: { variantId, warehouseId } },
    select: { id: true, quantityOnHand: true, quantityReserved: true },
  });

  const item =
    existing ??
    (await transaction.inventoryItem.create({
      data: { variantId, warehouseId, quantityOnHand: 0, quantityReserved: 0 },
      select: { id: true, quantityOnHand: true, quantityReserved: true },
    }));

  const newOnHand = item.quantityOnHand + quantity;

  await transaction.inventoryItem.update({
    where: { id: item.id },
    data: { quantityOnHand: newOnHand },
  });

  await recordMovement(transaction, {
    variantId,
    warehouseId,
    type: "INTAKE",
    quantityChange: quantity,
    quantityOnHandAfter: newOnHand,
    quantityReservedAfter: item.quantityReserved,
    context,
  });
}

/**
 * Returns units of a counter sale: stock goes back to the branch ledger, money is
 * recorded as a Refund and the order carries how much of every line has returned.
 * A line can never be returned beyond what was sold; returning everything flips the
 * order to RETURNED.
 */
export async function returnPosSale(
  account: AuthenticatedAccount,
  orderId: string,
  payload: unknown,
): Promise<PosReturnResult> {
  const distributor = requireDistributor(account);
  const input = parsePosReturnInput(payload);
  const warehouseIds = await resolveWarehouseIds(distributor.branchId);

  if (warehouseIds.length === 0) {
    throw new ConflictError("The branch has no active warehouse to restock.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const order = await loadSaleForReturn(transaction, orderId, distributor.branchId);
      const itemsById = new Map(order.items.map((item) => [item.id, item]));

      let refunded = new Prisma.Decimal(0);
      let returnedUnits = 0;

      for (const line of input.lines) {
        const item = itemsById.get(line.orderItemId);

        if (!item) {
          throw new NotFoundError("One of the lines does not belong to this sale.");
        }

        const remaining = item.quantity - item.returnedQuantity;

        if (line.quantity > remaining) {
          throw new ConflictError(
            `Only ${remaining} unit(s) of ${item.variant.sku} can still be returned.`,
          );
        }

        refunded = refunded.add(item.unitPrice.mul(line.quantity));
        returnedUnits += line.quantity;

        await transaction.orderItem.update({
          where: { id: item.id },
          data: { returnedQuantity: item.returnedQuantity + line.quantity },
        });

        await restockReturnedLine(transaction, item.variantId, warehouseIds[0], line.quantity, {
          actorAccountId: account.id,
          reason: `POS return on ${order.orderNumber}`,
        });
      }

      await transaction.refund.create({
        data: {
          orderId: order.id,
          paymentId: order.paymentId,
          amount: refunded,
          currency: order.currency,
          reason: input.reason ?? `POS return on ${order.orderNumber}`,
          refundedByAccountId: account.id,
        },
      });

      const after = await transaction.orderItem.findMany({
        where: { orderId: order.id },
        select: { quantity: true, returnedQuantity: true },
      });
      const fullyReturned = after.every((item) => item.returnedQuantity >= item.quantity);

      const updated = await transaction.order.update({
        where: { id: order.id },
        data: { status: fullyReturned ? OrderStatus.RETURNED : OrderStatus.CONFIRMED },
        select: { id: true, orderNumber: true, status: true, currency: true },
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "POS_SALE_RETURNED",
          entity: "Order",
          entityId: order.id,
          newValue: `${returnedUnits} unit(s), ${refunded.toFixed(2)} ${order.currency}`,
        },
      });

      return {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        refundedAmount: refunded.toFixed(2),
        currency: updated.currency,
        returnedUnits,
        fullyReturned,
      };
    }),
  );
}

/** Returns every remaining unit, i.e. cancels the sale, and marks it as a void. */
export async function voidPosSale(account: AuthenticatedAccount, orderId: string): Promise<PosReturnResult> {
  const distributor = requireDistributor(account);

  if (!isUuid(orderId)) {
    throw new NotFoundError("The sale was not found.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, channel: OrderChannel.POS },
    select: {
      branchId: true,
      items: { select: { id: true, quantity: true, returnedQuantity: true } },
    },
  });

  if (!order || order.branchId !== distributor.branchId) {
    throw new NotFoundError("The sale was not found.");
  }

  const lines = order.items
    .filter((item) => item.quantity > item.returnedQuantity)
    .map((item) => ({ orderItemId: item.id, quantity: item.quantity - item.returnedQuantity }));

  if (lines.length === 0) {
    throw new ConflictError("The sale is already fully returned.");
  }

  const result = await returnPosSale(account, orderId, { lines, reason: "Pos sale voided" });

  await prisma.auditLog.create({
    data: {
      accountId: account.id,
      action: "POS_SALE_VOIDED",
      entity: "Order",
      entityId: orderId,
      newValue: `${result.returnedUnits} unit(s), ${result.refundedAmount} ${result.currency}`,
    },
  });

  return result;
}

/** The branch's counter sales, newest first, with their return state. */
export async function listPosSales(account: AuthenticatedAccount, limit = 25): Promise<PosHistoryRow[]> {
  const distributor = requireDistributor(account);
  const take = Math.min(Math.max(limit, 1), 100);

  const orders = await prisma.order.findMany({
    where: { channel: OrderChannel.POS, branchId: distributor.branchId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      totalAmount: true,
      currency: true,
      refunds: { select: { amount: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          returnedQuantity: true,
          unitPrice: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  return orders.map((order) => {
    const refunded = order.refunds.reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    const soldUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const returnedUnits = order.items.reduce((sum, item) => sum + item.returnedQuantity, 0);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      totalAmount: order.totalAmount.toFixed(2),
      currency: order.currency,
      refundedAmount: refunded.toFixed(2),
      returnedUnits,
      soldUnits,
      lines: order.items.map((item) => ({
        orderItemId: item.id,
        sku: item.variant.sku,
        productName: item.variant.product.name,
        quantity: item.quantity,
        returnedQuantity: item.returnedQuantity,
        unitPrice: item.unitPrice.toFixed(2),
      })),
    };
  });
}


export type PosInvoiceLine = {
  orderItemId: string;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  quantity: number;
  returnedQuantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type PosInvoiceView = {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  currency: string;
  totalAmount: string;
  refundedAmount: string;
  soldUnits: number;
  returnedUnits: number;
  branchCode: string;
  branchName: string;
  soldBy: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  lines: PosInvoiceLine[];
};

/** Every detail of one counter sale, for the invoice page. */
export async function getPosSaleDetail(
  account: AuthenticatedAccount,
  orderId: string,
): Promise<PosInvoiceView> {
  const distributor = requireDistributor(account);

  if (!isUuid(orderId)) {
    throw new NotFoundError("The sale was not found.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, channel: OrderChannel.POS },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      totalAmount: true,
      currency: true,
      branchId: true,
      branch: { select: { code: true, name: true } },
      soldBy: { select: { email: true, phone: true } },
      refunds: { select: { amount: true } },
      payments: { orderBy: { createdAt: "asc" }, select: { method: true, status: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          returnedQuantity: true,
          unitPrice: true,
          variant: { select: { sku: true, size: true, color: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!order || order.branchId !== distributor.branchId || !order.branch) {
    throw new NotFoundError("The sale was not found.");
  }

  const refunded = order.refunds.reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
  const soldUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedUnits = order.items.reduce((sum, item) => sum + item.returnedQuantity, 0);
  const payment = order.payments[0] ?? null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    currency: order.currency,
    totalAmount: order.totalAmount.toFixed(2),
    refundedAmount: refunded.toFixed(2),
    soldUnits,
    returnedUnits,
    branchCode: order.branch.code,
    branchName: order.branch.name,
    soldBy: order.soldBy?.email ?? order.soldBy?.phone ?? "",
    paymentMethod: payment?.method ?? null,
    paymentStatus: payment?.status ?? null,
    lines: order.items.map((item) => ({
      orderItemId: item.id,
      sku: item.variant.sku,
      productName: item.variant.product.name,
      size: item.variant.size,
      color: item.variant.color,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
    })),
  };
}
