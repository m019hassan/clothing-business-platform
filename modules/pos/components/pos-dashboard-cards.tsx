import type { PosDashboardView } from "@/modules/pos/types";
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

export function PosDashboardCards({ dashboard }: { dashboard: PosDashboardView }) {
  const currency = "SAR";

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="My sales today"
          value={formatMoney(dashboard.salesToday.total, currency)}
          hint={`${dashboard.salesToday.orders} sale(s) · ${dashboard.salesToday.items} item(s)`}
        />
        <Card
          label="My sales this month"
          value={formatMoney(dashboard.salesThisMonth.total, currency)}
          hint={`${dashboard.salesThisMonth.orders} sale(s) · ${dashboard.salesThisMonth.items} item(s)`}
        />
        <Card
          label="Stock left in the branch"
          value={String(dashboard.stock.totalAvailable)}
          hint={`${dashboard.stock.trackedItems} product(s) · ${dashboard.stock.totalOnHand} on hand`}
        />
        <Card
          label="Needs attention"
          value={`${dashboard.stock.outOfStockCount} / ${dashboard.stock.lowStockCount}`}
          hint="Out of stock / low stock (below 10)"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">What is running out</h3>
          <p className="mt-1 text-xs text-slate-500">
            Lowest availability first — tell the store to restock these.
          </p>
          {dashboard.shortages.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Everything is comfortably in stock.</p>
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
          <h3 className="text-base font-semibold text-slate-900">Selling best in the branch</h3>
          <p className="mt-1 text-xs text-slate-500">Last 30 days, by units sold at the counter.</p>
          {dashboard.topSellers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No counter sales recorded yet.</p>
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
