import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { getDistributorDashboard } from "@/modules/pos/application/pos-dashboard";
import { PosBranchInsights } from "@/modules/pos/components/pos-branch-insights";
import { PosDashboardCards } from "@/modules/pos/components/pos-dashboard-cards";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { getDashboardOperations, getDashboardSummary } from "@/modules/dashboard/application/summary";
import type { DashboardSummary } from "@/modules/dashboard/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { StatCard } from "@/components/ui/stat-card";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  FileTextIcon,
  ShoppingBagIcon,
  StoreIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

export default async function DashboardPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const scope = await resolveBranchScope(account);
  const { t } = await getInterfaceLanguage();

  let summary: DashboardSummary | null = null;
  let loadError = false;

  try {
    summary = await getDashboardSummary(account);
  } catch {
    loadError = true;
  }

  if (account.accountType === "DISTRIBUTOR") {
    let posDashboard = null;

    try {
      posDashboard = await getDistributorDashboard(account);
    } catch {
      posDashboard = null;
    }

    if (posDashboard) {
      return (
        <div className="space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t.pos.kicker}</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {posDashboard.branchName} ({posDashboard.branchCode})
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t.dashboard.accountSubtitle}</p>
            </div>
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow"
            >
              <StoreIcon className="h-4 w-4" />
              {t.pos.completeSale}
            </Link>
          </section>

          <PosDashboardCards dashboard={posDashboard} labels={{
            ...t.pos,
            each: t.cart.each,
            openInvoice: t.posInvoice.openInvoice,
            photoView: t.productImages.view,
            photoClose: t.productImages.close,
            photoPrevious: t.common.previous,
            photoNext: t.common.next,
          }} />
          <PosBranchInsights dashboard={posDashboard} labels={{
            ...t.pos,
            each: t.cart.each,
            openInvoice: t.posInvoice.openInvoice,
            photoView: t.productImages.view,
            photoClose: t.productImages.close,
            photoPrevious: t.common.previous,
            photoNext: t.common.next,
          }} />
        </div>
      );
    }
  }

  if (account.accountType === "EMPLOYEE") {
    const permissions = await getCurrentPermissions();

    return (
      <OperationsOverview
        operations={await getDashboardOperations(permissions, scope)}
        recentOrders={summary?.recentOrders ?? []}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/50 to-white p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t.dashboard.kicker}</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">{t.dashboard.welcome}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {summary?.scope === "business"
              ? t.dashboard.businessSubtitle
              : t.dashboard.accountSubtitle}
          </p>
        </div>
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">{t.dashboard.loadErrorTitle}</h3>
          <p className="mt-1 text-sm text-rose-700">
            {t.dashboard.loadErrorBody}
          </p>
        </section>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t.dashboard.orders}
              value={String(summary?.orderCount ?? 0)}
              variant="blue"
              icon={<FileTextIcon className="h-5 w-5" />}
            />
            <StatCard
              label={t.dashboard.pendingOrders}
              value={String(summary?.pendingOrderCount ?? 0)}
              hint={t.dashboard.pendingOrdersHint}
              variant="amber"
              icon={<TrendingUpIcon className="h-5 w-5" />}
            />
            <StatCard
              label={t.dashboard.products}
              value={String(summary?.productCount ?? 0)}
              hint={t.dashboard.productsHint}
              variant="indigo"
              icon={<ShoppingBagIcon className="h-5 w-5" />}
            />
            <StatCard
              label={t.dashboard.lowStock}
              value={String(summary?.lowStockCount ?? 0)}
              hint={t.dashboard.lowStockHint}
              variant="rose"
              icon={<AlertCircleIcon className="h-5 w-5" />}
            />
          </section>

          {/* Recent Orders Section */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.dashboard.recentOrders}</h3>
                <p className="text-xs text-slate-500">{t.dashboard.recentOrdersHint}</p>
              </div>
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>{t.common.view}</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {summary && summary.recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50/75 text-start text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 text-start">{t.common.order}</th>
                      <th scope="col" className="px-6 py-3.5 text-start">{t.common.status}</th>
                      <th scope="col" className="px-6 py-3.5 text-start">{t.common.total}</th>
                      <th scope="col" className="px-6 py-3.5 text-start">{t.common.date}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-6 py-4">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <OrderStatusBadge status={order.status} labels={t.orderStatus} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">
                          {formatMoney(order.totalAmount, order.currency)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileTextIcon className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">{t.dashboard.noOrders}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {t.dashboard.noOrdersHint}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
