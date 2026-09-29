import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getPosSaleDetail } from "@/modules/pos/application/pos-returns";
import { PrintButton } from "@/modules/pos/components/print-button";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PosInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAuthenticated();
  const { t, locale } = await getInterfaceLanguage();
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

  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const statusLabel =
    invoice.status === "RETURNED"
      ? t.posHistory.statusReturned
      : invoice.returnedUnits > 0
        ? t.posHistory.statusPartial
        : t.posHistory.statusSold;

  const net = formatMoney((Number(invoice.totalAmount) - Number(invoice.refundedAmount)).toFixed(2), invoice.currency);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/pos/history" className="text-sm text-blue-700 hover:underline">
          ← {t.posHistory.title}
        </Link>
        <PrintButton label={t.posInvoice.print} />
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.posInvoice.title}</h1>
            <p className="mt-1 font-mono text-sm text-slate-600">{invoice.orderNumber}</p>
            <p className="text-xs text-slate-500">{dateFormat.format(new Date(invoice.createdAt))}</p>
          </div>
          <div className="text-end text-sm text-slate-700">
            <p className="font-semibold">
              {invoice.branchName} ({invoice.branchCode})
            </p>
            {invoice.soldBy ? <p className="text-xs text-slate-500">{invoice.soldBy}</p> : null}
            <span
              className={[
                "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                invoice.status === "RETURNED"
                  ? "bg-rose-100 text-rose-800"
                  : invoice.returnedUnits > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
              ].join(" ")}
            >
              {statusLabel}
            </span>
          </div>
        </header>

        <table className="mt-4 w-full text-sm">
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
                <td className="py-2.5 text-end text-slate-700">{formatMoney(line.unitPrice, invoice.currency)}</td>
                <td className="py-2.5 text-end font-medium text-slate-900">
                  {formatMoney(line.lineTotal, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ms-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{t.posInvoice.total}</dt>
            <dd className="font-semibold text-slate-900">{formatMoney(invoice.totalAmount, invoice.currency)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">{t.posHistory.refunded}</dt>
            <dd className="text-slate-700">{formatMoney(invoice.refundedAmount, invoice.currency)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
            <dt className="font-medium text-slate-700">{t.posInvoice.net}</dt>
            <dd className="text-base font-bold text-slate-900">{net}</dd>
          </div>
        </dl>

        <footer className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500">
          {t.posInvoice.payment}:{" "}
          {invoice.paymentMethod === "CASH" ? t.posInvoice.cash : (invoice.paymentMethod ?? "—")} ·{" "}
          {t.posInvoice.unitsSold}: {invoice.soldUnits}
          {invoice.returnedUnits > 0
            ? ` · ${t.posHistory.unitsReturned.replace("{count}", String(invoice.returnedUnits))}`
            : ""}
        </footer>
      </article>
    </div>
  );
}
