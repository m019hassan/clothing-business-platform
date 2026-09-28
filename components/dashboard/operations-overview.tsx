import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { DashboardOperationsView, DashboardOrderRow } from "@/modules/dashboard/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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

export async function OperationsOverview({
  operations,
  recentOrders,
}: {
  operations: DashboardOperationsView;
  recentOrders: DashboardOrderRow[];
}) {
  const { t } = await getInterfaceLanguage();
  const hasAnyBlock =
    operations.orders !== null ||
    operations.payments !== null ||
    operations.inventory !== null ||
    operations.customers !== null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.dashboard.operations.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.dashboard.operations.title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {t.dashboard.operations.subtitle}
        </p>
      </section>

      {!hasAnyBlock ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.dashboard.operations.empty}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.dashboard.operations.emptyHint}
          </p>
        </section>
      ) : null}

      {operations.orders ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.dashboard.operations.orders}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label={t.dashboard.operations.ordersTotal} value={String(operations.orders.total)} />
            <MetricCard
              label={t.dashboard.operations.ordersPending}
              value={String(operations.orders.pending)}
              hint={t.dashboard.operations.ordersPendingHint}
            />
            <MetricCard label={t.dashboard.operations.ordersInProgress} value={String(operations.orders.inProgress)} hint={t.dashboard.operations.ordersInProgressHint} />
            <MetricCard label={t.dashboard.operations.ordersDelivered} value={String(operations.orders.delivered)} />
            <MetricCard label={t.dashboard.operations.ordersCancelled} value={String(operations.orders.cancelled)} />
          </div>
        </section>
      ) : null}

      {operations.payments ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.dashboard.operations.payments}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t.dashboard.operations.paymentsAll} value={String(operations.payments.total)} />
            <MetricCard
              label={t.dashboard.operations.paymentsAwaiting}
              value={String(operations.payments.pending)}
              href="/payments"
              hint={t.dashboard.operations.paymentsOpen}
            />
            <MetricCard label={t.dashboard.operations.paymentsApproved} value={String(operations.payments.approved)} />
            <MetricCard label={t.dashboard.operations.paymentsRejected} value={String(operations.payments.rejected)} />
          </div>
        </section>
      ) : null}

      {operations.inventory ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.dashboard.operations.inventory}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t.dashboard.operations.inventoryTracked} value={String(operations.inventory.trackedRows)} href="/inventory" />
            <MetricCard
              label={t.dashboard.operations.inventoryAvailable}
              value={String(operations.inventory.totalAvailable)}
              hint={`${t.dashboard.operations.onHand} ${operations.inventory.totalOnHand} · ${t.dashboard.operations.reserved} ${operations.inventory.totalReserved}`}
            />
            <MetricCard label={t.dashboard.operations.inventoryLow} value={String(operations.inventory.lowStockRows)} hint={t.dashboard.operations.inventoryLowHint} />
            <MetricCard label={t.dashboard.operations.inventoryOut} value={String(operations.inventory.outOfStockRows)} />
          </div>
        </section>
      ) : null}

      {operations.customers ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.dashboard.operations.customers}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={t.dashboard.operations.customersProfiles} value={String(operations.customers.total)} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{t.dashboard.operations.recentOrders}</h3>
          <p className="text-sm text-slate-500">{t.dashboard.operations.recentOrdersHint}</p>
        </div>

        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.common.order}</th>
                  <th scope="col" className="px-6 py-3">{t.common.status}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.common.total}</th>
                  <th scope="col" className="px-6 py-3">{t.dashboard.operations.placed}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <OrderStatusBadge status={order.status} labels={t.orderStatus} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">
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
            <p className="text-sm font-medium text-slate-700">{t.dashboard.operations.noOrders}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">{t.dashboard.operations.notAvailable}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t.dashboard.operations.notAvailableBody}
        </p>
      </section>
    </div>
  );
}
