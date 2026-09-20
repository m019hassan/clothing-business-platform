import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { DashboardOperationsView, DashboardOrderRow } from "@/modules/dashboard/types";
import { formatDate, formatMoney } from "@/src/lib/format";

function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </>
  );

  const className =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md";

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function OperationsOverview({
  operations,
  recentOrders,
}: {
  operations: DashboardOperationsView;
  recentOrders: DashboardOrderRow[];
}) {
  const hasAnyBlock =
    operations.orders !== null ||
    operations.payments !== null ||
    operations.inventory !== null ||
    operations.customers !== null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Operations</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Business overview</h2>
        <p className="mt-2 text-sm text-slate-600">
          Live totals from the existing modules. Sections you are not permitted to view are hidden.
        </p>
      </section>

      {!hasAnyBlock ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">No operational modules for this role yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Ask a manager to grant access such as inventory.view or payments.view.
          </p>
        </section>
      ) : null}

      {operations.orders ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Orders</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total orders" value={String(operations.orders.total)} />
            <MetricCard
              label="Pending"
              value={String(operations.orders.pending)}
              hint="Draft or awaiting payment"
            />
            <MetricCard label="In progress" value={String(operations.orders.inProgress)} hint="Confirmed to shipped" />
            <MetricCard label="Delivered" value={String(operations.orders.delivered)} />
            <MetricCard label="Cancelled" value={String(operations.orders.cancelled)} />
          </div>
        </section>
      ) : null}

      {operations.payments ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Payments</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="All payments" value={String(operations.payments.total)} />
            <MetricCard
              label="Awaiting outcome"
              value={String(operations.payments.pending)}
              href="/payments"
              hint="Open the payments queue"
            />
            <MetricCard label="Approved" value={String(operations.payments.approved)} />
            <MetricCard label="Rejected" value={String(operations.payments.rejected)} />
          </div>
        </section>
      ) : null}

      {operations.inventory ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Inventory</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tracked balances" value={String(operations.inventory.trackedRows)} href="/inventory" />
            <MetricCard
              label="Available units"
              value={String(operations.inventory.totalAvailable)}
              hint={`On hand ${operations.inventory.totalOnHand} · reserved ${operations.inventory.totalReserved}`}
            />
            <MetricCard label="Low stock" value={String(operations.inventory.lowStockRows)} hint="Below 10 available" />
            <MetricCard label="Out of stock" value={String(operations.inventory.outOfStockRows)} />
          </div>
        </section>
      ) : null}

      {operations.customers ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Customers</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Customer profiles" value={String(operations.customers.total)} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Recent orders</h3>
          <p className="text-sm text-slate-500">Latest orders across all customers</p>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Order</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Total</th>
                  <th scope="col" className="px-6 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No orders yet</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Not available yet</h3>
        <p className="mt-1 text-sm text-slate-500">
          Staff order management, customer management, employee and role administration, delivery, notifications
          and audit logs have no backend endpoints yet, so they are not shown here.
        </p>
      </section>
    </div>
  );
}
