import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listPosSales } from "@/modules/pos/application/pos-returns";
import { PosReturnPanel } from "@/modules/pos/components/pos-return-panel";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PosHistoryPage() {
  const account = await requireAuthenticated();
  const { t, locale } = await getInterfaceLanguage();

  let sales;

  try {
    sales = await listPosSales(account);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }

    throw error;
  }

  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <Link href="/pos" className="text-sm text-blue-700 hover:underline">
          ← {t.pos.kicker}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.posHistory.title}</h1>
        <p className="text-sm text-slate-600">{t.posHistory.subtitle}</p>
      </header>

      {sales.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-500 shadow-sm">
          {t.posHistory.empty}
        </p>
      ) : (
        <ul className="space-y-4">
          {sales.map((sale) => {
            const remaining = sale.soldUnits - sale.returnedUnits;
            const badge =
              sale.status === "RETURNED"
                ? { text: t.posHistory.statusReturned, className: "bg-rose-100 text-rose-800" }
                : sale.returnedUnits > 0
                  ? { text: t.posHistory.statusPartial, className: "bg-amber-100 text-amber-800" }
                  : { text: t.posHistory.statusSold, className: "bg-emerald-100 text-emerald-800" };

            return (
              <li key={sale.orderId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">{sale.orderNumber}</p>
                    <p className="text-xs text-slate-500">{dateFormat.format(new Date(sale.createdAt))}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={["rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.className].join(" ")}>
                      {badge.text}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatMoney(sale.totalAmount, sale.currency)}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-slate-50 px-5 py-2 text-sm">
                  {sale.lines.map((line) => (
                    <li key={line.orderItemId} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span className="text-slate-700">
                        {line.productName} <span className="font-mono text-xs text-slate-400">{line.sku}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {t.posHistory.sold} {line.quantity}
                        {line.returnedQuantity > 0 ? ` · ${t.posHistory.returned} ${line.returnedQuantity}` : ""} ·{" "}
                        {formatMoney(line.unitPrice, sale.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {t.posHistory.refunded}: {formatMoney(sale.refundedAmount, sale.currency)}
                    {sale.returnedUnits > 0 ? ` · ${t.posHistory.unitsReturned.replace("{count}", String(sale.returnedUnits))}` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pos/sales/${sale.orderId}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {t.posInvoice.openInvoice}
                    </Link>
                    {remaining > 0 ? <PosReturnPanel sale={sale} labels={t.posHistory} /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
