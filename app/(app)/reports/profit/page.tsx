import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { parseReportPeriod } from "@/modules/reports/application/reports";
import { getProfitReport } from "@/modules/reports/application/profit";
import type { ReportPeriod } from "@/modules/reports/types";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();
  const periodOptions: { value: ReportPeriod; label: string }[] = [
    { value: "all", label: t.reports.allTime },
    { value: "7d", label: t.reports.last7 },
    { value: "30d", label: t.reports.last30 },
    { value: "90d", label: t.reports.last90 },
  ];

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.PRODUCTS_COST_VIEW) || !permissions.has(PERMISSIONS.ORDERS_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.reports.profit.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{t.reports.profit.permissionHint}</p>
        <Link
          href="/reports"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.reports}
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const period = parseReportPeriod(params.period);
  const scope = await resolveBranchScope(account);
  const report = await getProfitReport(permissions, period, scope);

  const revenueNumber = Number(report.totals.revenue);
  const profitNumber = Number(report.totals.profit);
  const margin = revenueNumber > 0 ? `${Math.round((profitNumber / revenueNumber) * 1000) / 10}%` : "—";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.reports.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.reports.profit.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.reports.profit.subtitle}</p>

        <nav className="mt-4 flex flex-wrap gap-2" aria-label={t.reports.periodAria}>
          {periodOptions.map((option) => (
            <Link
              key={option.value}
              href={`/reports/profit?period=${option.value}`}
              aria-current={period === option.value ? "page" : undefined}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                period === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100",
              ].join(" ")}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t.reports.profit.revenue} value={formatMoney(report.totals.revenue, report.currency)} />
        <MetricCard label={t.reports.profit.cost} value={formatMoney(report.totals.cost, report.currency)} />
        <MetricCard label={t.reports.profit.profit} value={formatMoney(report.totals.profit, report.currency)} hint={t.reports.profit.hint} />
        <MetricCard
          label={t.reports.profit.margin}
          value={margin}
          hint={
            report.totals.missingCostUnits > 0
              ? t.reports.profit.missingCostHint.replace("{units}", String(report.totals.missingCostUnits))
              : `${t.reports.profit.netUnits}: ${report.totals.netUnits}`
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {report.rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">{t.reports.profit.empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t.reports.profit.product}</th>
                <th className="px-4 py-3 text-end font-medium">{t.reports.profit.netUnits}</th>
                <th className="px-4 py-3 text-end font-medium">{t.reports.profit.revenue}</th>
                <th className="px-4 py-3 text-end font-medium">{t.reports.profit.cost}</th>
                <th className="px-4 py-3 text-end font-medium">{t.reports.profit.profit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={row.productId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.productName}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{row.netUnits}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{formatMoney(row.revenue, row.currency)}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{formatMoney(row.cost, row.currency)}</td>
                  <td className="px-4 py-3 text-end font-semibold text-slate-900">{formatMoney(row.profit, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
