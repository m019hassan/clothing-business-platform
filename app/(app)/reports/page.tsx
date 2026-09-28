import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { getReportsOverview, parseReportPeriod } from "@/modules/reports/application/reports";
import type { ReportPeriod, ReportsOverviewView } from "@/modules/reports/types";
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

export default async function ReportsPage({
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

  const scope = await resolveBranchScope(account);

  const permissions = await getCurrentPermissions();
  const canViewOrders = permissions.has(PERMISSIONS.ORDERS_VIEW);
  const canViewPayments = permissions.has(PERMISSIONS.PAYMENTS_VIEW);
  const canViewInventory = permissions.has(PERMISSIONS.INVENTORY_VIEW);

  if (!canViewOrders && !canViewPayments && !canViewInventory) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.reports.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.reports.noReportingPermission}
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const period = parseReportPeriod(params.period);

  let overview: ReportsOverviewView | null = null;
  let loadError = false;

  try {
    overview = await getReportsOverview(permissions, period, scope);
  } catch {
    loadError = true;
  }

  if (loadError || overview === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.reports.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
      </section>
    );
  }

  const { sales, topProducts, topCustomers, payments, inventory } = overview;
  const maxStatusCount = sales
    ? Math.max(...sales.byStatus.map((row) => row.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.reports.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.reports.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t.reports.subtitle}
        </p>

        <nav className="mt-4 flex flex-wrap gap-2" aria-label={t.reports.periodAria}>
          {periodOptions.map((option) => (
            <Link
              key={option.value}
              href={`/reports?period=${option.value}`}
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

      {sales ? (
        <>
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.reports.salesTitle}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={t.reports.ordersPlaced}
                value={String(sales.placedCount)}
                hint={t.reports.valueHint.replace("{value}", formatMoney(sales.placedTotal, "SAR"))}
              />
              <MetricCard
                label={t.reports.realisedSales}
                value={formatMoney(sales.confirmedTotal, "SAR")}
                hint={t.reports.confirmedHint.replace("{count}", String(sales.confirmedCount))}
              />
              <MetricCard
                label={t.reports.averageOrderValue}
                value={formatMoney(sales.averageOrderValue, "SAR")}
                hint={t.reports.averageHint}
              />
              <MetricCard
                label={t.reports.cancelled}
                value={String(sales.cancelledCount)}
                hint={t.reports.valueHint.replace("{value}", formatMoney(sales.cancelledTotal, "SAR"))}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">{t.reports.byStatusTitle}</h3>
              <p className="text-sm text-slate-500">{t.reports.byStatusHint}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">{t.reports.status}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.reports.orders}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.reports.value}</th>
                    <th scope="col" className="px-6 py-3">{t.reports.share}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.byStatus
                    .filter((row) => row.count > 0)
                    .map((row) => (
                      <tr key={row.status}>
                        <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-800">
                          {row.status.replaceAll("_", " ")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{row.count}</td>
                        <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">
                          {formatMoney(row.total, "SAR")}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className="block h-2 rounded-full bg-slate-900/80"
                            style={{ width: `${Math.round((row.count / maxStatusCount) * 100)}%`, minWidth: "4px" }}
                            aria-hidden
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {sales.placedCount === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">{t.reports.noOrders}</p>
              </div>
            ) : null}
          </section>

          {topProducts ? (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-slate-900">{t.reports.topProducts}</h3>
                  <p className="text-sm text-slate-500">
                    {t.reports.topCustomersNote}
                  </p>
                </div>
                {topProducts.length > 0 ? (
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-6 py-3">Product</th>
                        <th scope="col" className="px-6 py-3 text-end">Units</th>
                        <th scope="col" className="px-6 py-3 text-end">{t.reports.revenue}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topProducts.map((row) => (
                        <tr key={row.productId} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <Link href={`/products/${row.productId}`} className="font-medium text-slate-800 hover:text-blue-700">
                              {row.productName}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-end text-slate-700">{row.quantity}</td>
                          <td className="px-6 py-3 text-end text-slate-700">
                            {formatMoney(row.revenue, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">No realised sales in this period</p>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="text-base font-semibold text-slate-900">{t.reports.topCustomers}</h3>
                  <p className="text-sm text-slate-500">{t.reports.topCustomersHint}</p>
                </div>
                {topCustomers && topCustomers.length > 0 ? (
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-6 py-3">{t.common.customer}</th>
                        <th scope="col" className="px-6 py-3 text-end">{t.reports.orders}</th>
                        <th scope="col" className="px-6 py-3 text-end">{t.reports.revenue}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topCustomers.map((row) => (
                        <tr key={row.customerCode}>
                          <td className="px-6 py-3">
                            <p className="font-medium text-slate-800">{row.customerName}</p>
                            <p className="text-xs text-slate-500">{row.customerCode}</p>
                          </td>
                          <td className="px-6 py-3 text-end text-slate-700">{row.orders}</td>
                          <td className="px-6 py-3 text-end text-slate-700">
                            {formatMoney(row.revenue, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {topCustomers === null
                        ? t.reports.requiresCustomersPermission
                        : "No realised sales in this period"}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {payments ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Payments</h3>
              <p className="text-sm text-slate-500">{payments.total} payment records in this period</p>
            </div>
            <Link href="/payments" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100">
              {t.reports.openQueue}
            </Link>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">{t.reports.status}</th>
                <th scope="col" className="px-6 py-3 text-end">Count</th>
                <th scope="col" className="px-6 py-3 text-end">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.byStatus
                .filter((row) => row.count > 0)
                .map((row) => (
                  <tr key={row.status}>
                    <td className="whitespace-nowrap px-6 py-3 font-medium text-slate-800">
                      {row.status.replaceAll("_", " ")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{row.count}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">
                      {formatMoney(row.amount, "SAR")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {inventory ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.reports.inventoryTitle}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t.inventory.trackedBalances} value={String(inventory.trackedRows)} />
            <MetricCard
              label={t.inventory.available}
              value={String(inventory.totalAvailable)}
              hint={`${t.inventory.onHand} ${inventory.totalOnHand} · ${t.inventory.reserved} ${inventory.totalReserved}`}
            />
            <MetricCard label={t.inventory.lowOrOut} value={String(inventory.lowStockRows)} hint={t.inventory.lowOrOutHint} />
            <MetricCard label={t.catalog.stockLabels.OUT_OF_STOCK} value={String(inventory.outOfStockRows)} />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">{t.reports.limitationsTitle}</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          <li>{t.reports.limitation1}</li>
          <li>{t.reports.limitation2}</li>
          <li>{t.reports.limitation3}</li>
          <li>{t.reports.limitation4}</li>
          <li>{t.reports.limitation5}</li>
        </ul>
      </section>
    </div>
  );
}
