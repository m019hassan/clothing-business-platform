import "server-only";

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { requireDistributor } from "@/modules/pos/application/pos-sales";
import { getPosSaleDetail } from "@/modules/pos/application/pos-returns";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

/** The words a CSV uses, taken from the interface dictionary so the export
 *  comes out in the reader's own language. */
export type PosCsvLabels = {
  invoice: string;
  date: string;
  status: string;
  statusSold: string;
  statusPartial: string;
  statusReturned: string;
  payment: string;
  unitsSold: string;
  unitsReturned: string;
  total: string;
  refunded: string;
  net: string;
  currency: string;
  sku: string;
  product: string;
  size: string;
  color: string;
  quantity: string;
  returned: string;
  unitPrice: string;
  lineTotal: string;
};

type Cell = string | number;

/** Quotes a cell when it holds a comma, quote or line break. */
function csvCell(value: Cell): string {
  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Builds the CSV body. The BOM keeps Excel reading Arabic correctly, and CRLF
 * line endings are what spreadsheet apps expect.
 */
function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function statusLabel(
  status: string,
  soldUnits: number,
  returnedUnits: number,
  labels: Pick<PosCsvLabels, "statusSold" | "statusPartial" | "statusReturned">,
): string {
  if (status === "RETURNED") return labels.statusReturned;
  if (returnedUnits > 0) return labels.statusPartial;

  return soldUnits > 0 ? labels.statusSold : status;
}

/**
 * One row per invoice for the branch's counter sales, newest first — the flat
 * sheet an accountant books from. Capped so one stray click cannot pull the
 * whole table.
 */
export async function exportPosSalesCsv(
  account: AuthenticatedAccount,
  labels: PosCsvLabels,
  limit = 500,
): Promise<string> {
  const distributor = requireDistributor(account);
  const take = Math.min(Math.max(Math.trunc(limit) || 500, 1), 1000);

  const orders = await withDatabaseError(() =>
    prisma.order.findMany({
      where: { channel: "POS", branchId: distributor.branchId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        totalAmount: true,
        currency: true,
        refunds: { select: { amount: true } },
        payments: { orderBy: { createdAt: "asc" }, select: { method: true } },
        items: { select: { quantity: true, returnedQuantity: true } },
      },
    }),
  );

  const rows = orders.map((order) => {
    const refunded = order.refunds.reduce((sum, refund) => sum.add(refund.amount), new Prisma.Decimal(0));
    const soldUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const returnedUnits = order.items.reduce((sum, item) => sum + item.returnedQuantity, 0);
    const net = order.totalAmount.sub(refunded);

    return [
      order.orderNumber,
      order.createdAt.toISOString(),
      statusLabel(order.status, soldUnits, returnedUnits, labels),
      order.payments[0]?.method ?? "",
      soldUnits,
      returnedUnits,
      order.totalAmount.toFixed(2),
      refunded.toFixed(2),
      net.toFixed(2),
      order.currency,
    ];
  });

  return toCsv(
    [
      labels.invoice,
      labels.date,
      labels.status,
      labels.payment,
      labels.unitsSold,
      labels.unitsReturned,
      labels.total,
      labels.refunded,
      labels.net,
      labels.currency,
    ],
    rows,
  );
}

/** One invoice as line items — the detail sheet behind a single sale. */
export async function exportPosSaleCsv(
  account: AuthenticatedAccount,
  orderId: string,
  labels: PosCsvLabels,
): Promise<string> {
  const invoice = await getPosSaleDetail(account, orderId);

  const rows: Cell[][] = invoice.lines.map((line) => [
    invoice.orderNumber,
    invoice.createdAt,
    line.sku,
    line.productName,
    line.size ?? "",
    line.color ?? "",
    line.quantity,
    line.returnedQuantity,
    line.unitPrice,
    line.lineTotal,
    invoice.currency,
  ]);

  rows.push(
    [labels.total, "", "", "", "", "", "", "", "", invoice.totalAmount, invoice.currency],
    [labels.refunded, "", "", "", "", "", "", "", "", invoice.refundedAmount, invoice.currency],
    [labels.net, "", "", "", "", "", "", "", "", (Number(invoice.totalAmount) - Number(invoice.refundedAmount)).toFixed(2), invoice.currency],
  );

  return toCsv(
    [
      labels.invoice,
      labels.date,
      labels.sku,
      labels.product,
      labels.size,
      labels.color,
      labels.quantity,
      labels.returned,
      labels.unitPrice,
      labels.lineTotal,
      labels.currency,
    ],
    rows,
  );
}
