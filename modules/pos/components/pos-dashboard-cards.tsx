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
  const currency = "EGP";

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

    </div>
  );
}
