import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OperationsOverview } from "@/components/dashboard/operations-overview";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { getDashboardOperations, getDashboardSummary } from "@/modules/dashboard/application/summary";
import type { DashboardSummary } from "@/modules/dashboard/types";
import { formatDate, formatMoney } from "@/src/lib/format";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  let summary: DashboardSummary | null = null;
  let loadError = false;

  try {
    summary = await getDashboardSummary(account);
  } catch {
    loadError = true;
  }

  if (account.accountType === "EMPLOYEE") {
    const permissions = await getCurrentPermissions();

    return (
      <OperationsOverview
        operations={await getDashboardOperations(permissions)}
        recentOrders={summary?.recentOrders ?? []}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-600">
          {summary?.scope === "business"
            ? "Business overview across all orders."
            : "Here is an overview of your account activity."}
        </p>
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">Unable to load dashboard data</h3>
          <p className="mt-1 text-sm text-rose-700">
            The summary could not be retrieved right now. Please refresh the page to try again.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Orders" value={String(summary?.orderCount ?? 0)} />
            <SummaryCard
              label="Pending Orders"
              value={String(summary?.pendingOrderCount ?? 0)}
              hint="Draft or awaiting payment"
            />
            <SummaryCard label="Products" value={String(summary?.productCount ?? 0)} hint="Active catalog items" />
            <SummaryCard
              label="Low Stock"
              value={String(summary?.lowStockCount ?? 0)}
              hint="Available below 10 units"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent Orders</h3>
                <p className="text-sm text-slate-500">Latest orders for this account</p>
              </div>
            </div>

            {summary && summary.recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-3">Order</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Total</th>
                      <th scope="col" className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                          {formatMoney(order.totalAmount, order.currency)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No orders yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Orders will appear here once they are created.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
