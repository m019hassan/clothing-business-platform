import type { PosDashboardView } from "@/modules/pos/types";
import type { PosLabels } from "@/modules/pos/components/pos-labels";
import { formatMoney } from "@/src/lib/format";

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
      <p className="truncate text-[11px] font-medium leading-tight text-slate-500 sm:text-sm">{label}</p>
      <p className="mt-1 text-sm font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 hidden text-xs text-slate-400 sm:block">{hint}</p> : null}
    </div>
  );
}

export function PosDashboardCards({ dashboard, labels }: { dashboard: PosDashboardView; labels: PosLabels }) {
  const currency = "EGP";

  return (
    <div className="space-y-3 sm:space-y-6">
      <section className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
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

    </div>
  );
}
