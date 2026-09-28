import type { PosDashboardView } from "@/modules/pos/types";
import type { PosLabels } from "@/modules/pos/components/pos-labels";
import { formatMoney } from "@/src/lib/format";

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function PosDashboardCards({ dashboard, labels }: { dashboard: PosDashboardView; labels: PosLabels }) {
  const currency = "SAR";

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label={labels.salesToday}
          value={formatMoney(dashboard.salesToday.total, currency)}
          hint={labels.salesHint
            .replace("{orders}", String(dashboard.salesToday.orders))
            .replace("{items}", String(dashboard.salesToday.items))}
        />
        <Card
          label={labels.salesThisMonth}
          value={formatMoney(dashboard.salesThisMonth.total, currency)}
          hint={labels.salesHint
            .replace("{orders}", String(dashboard.salesThisMonth.orders))
            .replace("{items}", String(dashboard.salesThisMonth.items))}
        />
        <Card
          label={labels.stockLeft}
          value={String(dashboard.stock.totalAvailable)}
          hint={labels.stockHint
            .replace("{products}", String(dashboard.stock.trackedItems))
            .replace("{onHand}", String(dashboard.stock.totalOnHand))}
        />
        <Card
          label={labels.needsAttention}
          value={`${dashboard.stock.outOfStockCount} / ${dashboard.stock.lowStockCount}`}
          hint={labels.needsAttentionHint}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{labels.runningOut}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Lowest availability first — tell the store to restock these.
          </p>
          {dashboard.shortages.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{labels.allInStock}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {dashboard.shortages.map((row) => (
                <li key={row.variantId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-900">{row.productName}</p>
                    <p className="text-xs text-slate-500">{row.sku}</p>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      row.availableQuantity <= 0
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {row.availableQuantity <= 0 ? "Out of stock" : `${row.availableQuantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{labels.sellingBest}</h3>
          <p className="mt-1 text-xs text-slate-500">{labels.sellingBestHint}</p>
          {dashboard.topSellers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{labels.noSales}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {dashboard.topSellers.map((row) => (
                <li key={row.variantId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-900">{row.productName}</p>
                    <p className="text-xs text-slate-500">{row.sku}</p>
                  </div>
                  <span className="shrink-0 text-sm text-slate-700">
                    {row.quantity} sold · {formatMoney(row.revenue, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
