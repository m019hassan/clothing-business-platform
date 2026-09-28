import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope, scopeDescription } from "@/modules/branches/application/scope";
import {
  DELIVERY_TRANSITIONS,
  listDeliveries,
  parseDeliveryFilters,
  type DeliveryFilters,
} from "@/modules/delivery/application/deliveries";
import { DeliveryRowActions } from "@/modules/delivery/components/delivery-row-actions";
import type { DeliveryQueueItemView } from "@/modules/delivery/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

const PAGE_SIZE = 20;

type DeliveriesPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string; status?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));

  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

export default async function DeliveriesPage({ searchParams }: DeliveriesPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();
  const statusOptions = [
    { value: "", label: t.deliveries.allStatuses },
    { value: "PENDING", label: t.deliveryStatus.PENDING },
    { value: "PROCESSING", label: t.deliveryStatus.PROCESSING },
    { value: "READY", label: t.deliveryStatus.READY },
    { value: "SHIPPED", label: t.deliveryStatus.SHIPPED },
    { value: "DELIVERED", label: t.deliveryStatus.DELIVERED },
    { value: "CANCELLED", label: t.deliveryStatus.CANCELLED },
  ] as const;

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const canRefundOrders = permissions.has(PERMISSIONS.PAYMENTS_REFUND);

  if (!permissions.has(PERMISSIONS.SHIPPING_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.deliveries.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.deliveries.permissionHint}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  const scope = await resolveBranchScope(account);
  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);

  const query = new URLSearchParams();
  if (typeof params.status === "string" && params.status.length > 0) {
    query.set("status", params.status);
  }

  let filters: DeliveryFilters = {};
  let filterError = false;

  try {
    filters = parseDeliveryFilters(query);
  } catch {
    filters = {};
    filterError = true;
  }

  let deliveries: DeliveryQueueItemView[] = [];
  let total = 0;
  let loadError = false;

  try {
    const page = await listDeliveries(account, { limit, offset }, filters);
    deliveries = page.deliveries;
    total = page.pagination.total;
  } catch {
    loadError = true;
  }

  const rangeStart = deliveries.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + deliveries.length;
  const hasNext = offset + deliveries.length < total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.deliveries.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.deliveries.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {scopeDescription(scope, t.scope)} — {t.deliveries.subtitleIntro}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <label htmlFor="status" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Filter
            </button>
            {query.size > 0 ? (
              <Link href="/deliveries" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        {filterError ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            Unknown status filter, so every delivery is shown.
          </p>
        ) : null}
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">{t.deliveries.loadErrorTitle}</h3>
          <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
        </section>
      ) : deliveries.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.deliveries.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.deliveries.emptyHint2}
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">{t.common.order}</th>
                    <th scope="col" className="px-6 py-3">{t.common.customer}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.common.total}</th>
                    <th scope="col" className="px-6 py-3">{t.common.status}</th>
                    <th scope="col" className="px-6 py-3">{t.deliveries.shipDeliver}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="align-top">
                      <td className="px-6 py-4">
                        <Link href={`/orders/${delivery.orderId}`} className="font-medium text-slate-900 hover:underline">
                          {delivery.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {delivery.dispatchedAt
                          ? `${t.orderDetail.dispatched} ${formatDate(delivery.dispatchedAt)}`
                          : `${t.common.created} ${formatDate(delivery.createdAt)}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        <p>{delivery.customerName}</p>
                        <p className="text-xs text-slate-500">{delivery.customerCode}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">
                        {formatMoney(delivery.totalAmount, delivery.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {delivery.status}
                        </span>
                        {delivery.carrier || delivery.trackingNumber ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {delivery.carrier ?? "—"} {delivery.trackingNumber ? `· ${delivery.trackingNumber}` : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <DeliveryRowActions
                        orderId={delivery.orderId}
                        canRefund={canRefundOrders}
                        errors={t.errors}
                        labels={{
                          saving: t.catalog.form.saving,
                          nextStatus: t.deliveries.nextStatus,
                          carrierPlaceholder: t.deliveries.carrierPlaceholder,
                          trackingPlaceholder: t.deliveries.trackingPlaceholder,
                          update: t.deliveries.update,
                          statusLabels: t.deliveryStatus as Record<string, string>,
                          refund: t.deliveries.refund,
                          refundConfirm: t.deliveries.refundConfirm,
                          transitions: {
                            PROCESSING: t.deliveries.startProcessing,
                            READY: t.deliveries.markReady,
                            SHIPPED: t.deliveries.markShipped,
                            DELIVERED: t.deliveries.markDelivered,
                            CANCELLED: t.deliveries.cancelDelivery,
                          },
                        }}
                          deliveryId={delivery.id}
                          status={delivery.status}
                          allowedTransitions={DELIVERY_TRANSITIONS[delivery.status]}
                          carrier={delivery.carrier}
                          trackingNumber={delivery.trackingNumber}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              {offset > 0 ? (
                <Link
                  href={`/deliveries?offset=${Math.max(offset - limit, 0)}&limit=${limit}${filters.status ? `&status=${filters.status}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.previous}</span>
              )}
              {hasNext ? (
                <Link
                  href={`/deliveries?offset=${offset + limit}&limit=${limit}${filters.status ? `&status=${filters.status}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.next}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.next}</span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
