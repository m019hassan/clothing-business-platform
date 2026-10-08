import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getPosSaleDetail } from "@/modules/pos/application/pos-returns";
import { PrintButton } from "@/modules/pos/components/print-button";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { generateInvoiceQr } from "@/src/lib/qr";
import { InvoiceCard } from "@/components/pos/invoice-card";
import { InvoiceQrCode } from "@/components/pos/invoice-qr-code";

export const dynamic = "force-dynamic";

export default async function PosInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAuthenticated();
  const { t } = await getInterfaceLanguage();
  const { id } = await params;

  let invoice;

  try {
    invoice = await getPosSaleDetail(account, id);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }

    throw error;
  }

  const status: "RETURNED" | "PARTIAL" | "SOLD" =
    invoice.status === "RETURNED"
      ? "RETURNED"
      : invoice.returnedUnits > 0
        ? "PARTIAL"
        : "SOLD";

  const net = formatMoney(
    (Number(invoice.totalAmount) - Number(invoice.refundedAmount)).toFixed(2),
    invoice.currency,
  );

  const total = formatMoney(invoice.totalAmount, invoice.currency);
  const refunded = formatMoney(invoice.refundedAmount, invoice.currency);

  const paymentMethodLabel =
    invoice.paymentMethod === "CASH" ? t.posInvoice.cash : (invoice.paymentMethod ?? "—");

  // Build the canonical invoice URL for the QR code
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const invoiceUrl = `${proto}://${host}/pos/sales/${id}`;

  // Generate QR code SVG on the server (zero client bundle cost)
  const qrSvg = await generateInvoiceQr(invoiceUrl);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Navigation + print button */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/pos/history" className="text-sm text-blue-700 hover:underline">
          ← {t.posHistory.title}
        </Link>
        <PrintButton label={t.posInvoice.print} />
      </div>

      {/* Invoice summary card + QR code side by side */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <InvoiceCard
            id={invoice.orderNumber}
            orderNumber={invoice.orderNumber}
            createdAt={invoice.createdAt}
            branchName={invoice.branchName}
            branchCode={invoice.branchCode}
            soldBy={invoice.soldBy ?? undefined}
            status={status}
            net={net}
            total={total}
            refunded={refunded}
            paymentMethod={paymentMethodLabel}
            soldUnits={invoice.soldUnits}
            returnedUnits={invoice.returnedUnits}
          />
        </div>

        {/* QR code – visible on screen and in print */}
        <div className="flex shrink-0 justify-center sm:justify-end">
          <InvoiceQrCode svgString={qrSvg} />
        </div>
      </div>

      {/* Items table (detail + print) */}
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t.posInvoice.item}
        </h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2 text-start font-medium">{t.posInvoice.item}</th>
              <th className="py-2 text-start font-medium">{t.posInvoice.details}</th>
              <th className="py-2 text-center font-medium">{t.posInvoice.quantity}</th>
              <th className="py-2 text-end font-medium">{t.posInvoice.unitPrice}</th>
              <th className="py-2 text-end font-medium">{t.posInvoice.lineTotal}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.lines.map((line) => (
              <tr key={line.orderItemId}>
                <td className="py-2.5 text-slate-900">
                  {line.productName}
                  <span className="ms-2 font-mono text-xs text-slate-400">{line.sku}</span>
                </td>
                <td className="py-2.5 text-xs text-slate-500">
                  {[line.size ? `${t.posInvoice.size} ${line.size}` : null, line.color]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <td className="py-2.5 text-center text-slate-900">
                  {line.quantity}
                  {line.returnedQuantity > 0 ? (
                    <span className="ms-1 text-xs text-rose-600">(-{line.returnedQuantity})</span>
                  ) : null}
                </td>
                <td className="py-2.5 text-end text-slate-700">
                  {formatMoney(line.unitPrice, invoice.currency)}
                </td>
                <td className="py-2.5 text-end font-medium text-slate-900">
                  {formatMoney(line.lineTotal, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals summary */}
        <dl className="mt-4 ms-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{t.posInvoice.total}</dt>
            <dd className="font-semibold text-slate-900">{total}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{t.posHistory.refunded}</dt>
            <dd className="text-slate-700">{refunded}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
            <dt className="font-medium text-slate-700">{t.posInvoice.net}</dt>
            <dd className="text-base font-bold text-slate-900">{net}</dd>
          </div>
        </dl>

        {/* Footer */}
        <footer className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500">
          {t.posInvoice.payment}: {paymentMethodLabel} · {t.posInvoice.unitsSold}:{" "}
          {invoice.soldUnits}
          {invoice.returnedUnits > 0
            ? ` · ${t.posHistory.unitsReturned.replace("{count}", String(invoice.returnedUnits))}`
            : ""}
        </footer>
      </article>
    </div>
  );
}
