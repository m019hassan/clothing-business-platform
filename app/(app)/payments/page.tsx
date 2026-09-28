import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentActions } from "@/components/payments/payment-actions";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listPendingPayments } from "@/modules/payment/application/payments";
import type { PendingPaymentPage } from "@/modules/payment/types";
import { formatDate, formatMoney } from "@/src/lib/format";
import { parsePaginationParams } from "@/src/lib/validation";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

const PAGE_SIZE = 10;

type PaymentsPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const canViewPayments = permissions.has(PERMISSIONS.PAYMENTS_VIEW);
  const canProcessPayments = permissions.has(PERMISSIONS.PAYMENTS_VERIFY);
  const canApprovePayments = permissions.has(PERMISSIONS.PAYMENTS_APPROVE);
  const canRejectPayments = permissions.has(PERMISSIONS.PAYMENTS_REJECT);
  // The decision column appears when the account can make at least one decision;
  // each button keeps its own permission inside the component.
  const canDecidePayments = canProcessPayments || canApprovePayments || canRejectPayments;

  if (!canViewPayments) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.payments.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the payments.view permission. Ask a manager to grant it.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const searchParamsObject = new URLSearchParams();

  if (params.offset !== undefined) searchParamsObject.set("offset", params.offset);
  searchParamsObject.set("limit", params.limit ?? String(PAGE_SIZE));

  let page: PendingPaymentPage | null = null;
  let loadError = false;

  try {
    page = await listPendingPayments(parsePaginationParams(searchParamsObject));
  } catch {
    loadError = true;
  }

  if (loadError || page === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.payments.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
      </section>
    );
  }

  const { rows, pagination } = page;
  const rangeStart = rows.length === 0 ? pagination.offset : pagination.offset + 1;
  const rangeEnd = pagination.offset + rows.length;
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + rows.length < pagination.total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.payments.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.payments.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t.payments.awaitingCount.replace("{count}", String(pagination.total))}
        </p>
        {!canDecidePayments ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {t.payments.noDecideHint}
          </p>
        ) : null}
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.payments.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.payments.emptyHint}
          </p>
        </section>
      ) : (
        <>
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.common.order}</th>
                  <th scope="col" className="px-6 py-3">{t.common.customer}</th>
                  <th scope="col" className="px-6 py-3">{t.common.payment}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.payments.amount}</th>
                  <th scope="col" className="px-6 py-3">{t.common.placed}</th>
                  {canDecidePayments ? (
                    <th scope="col" className="px-6 py-3 text-end">{t.common.actions}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.orderId} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="font-medium text-slate-900">{row.orderNumber}</p>
                      <p className="text-xs text-slate-500">
                        {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-800">{row.customerName}</p>
                      <p className="text-xs text-slate-500">{row.customerContact}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <PaymentStatusBadge status={row.paymentStatus} />
                      <p className="mt-1 text-xs text-slate-500">
                        {row.paymentMethod
                          ? (t.paymentMethod as Record<string, string>)[row.paymentMethod] ?? row.paymentMethod.replaceAll("_", " ")
                          : t.orderDetail.methodNotSelected}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">
                      {formatMoney(row.paymentAmount, row.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(row.createdAt)}</td>
                    {canDecidePayments ? (
                      <td className="whitespace-nowrap px-6 py-4 text-end">
                        <PaymentActions labels={t.payments} errors={t.errors}
                          payment={row}
                        canVerify={canProcessPayments}
                        canApprove={canApprovePayments}
                        canReject={canRejectPayments}
                      />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <div key={row.orderId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{row.orderNumber}</p>
                    <p className="truncate text-xs text-slate-500">{row.customerContact}</p>
                  </div>
                  <PaymentStatusBadge status={row.paymentStatus} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">{t.common.customer}</dt>
                    <dd className="text-slate-800">{row.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.payments.amount}</dt>
                    <dd className="text-slate-800">{formatMoney(row.paymentAmount, row.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.common.items}</dt>
                    <dd className="text-slate-800">{row.itemCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.common.placed}</dt>
                    <dd className="text-slate-800">{formatDate(row.createdAt)}</dd>
                  </div>
                </dl>
                {canDecidePayments ? (
                  <div className="mt-4">
                    <PaymentActions labels={t.payments} errors={t.errors}
                      payment={row}
                        canVerify={canProcessPayments}
                        canApprove={canApprovePayments}
                        canReject={canRejectPayments}
                      />
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/payments?offset=${Math.max(pagination.offset - pagination.limit, 0)}&limit=${pagination.limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.previous}</span>
              )}
              {hasNext ? (
                <Link
                  href={`/payments?offset=${pagination.offset + pagination.limit}&limit=${pagination.limit}`}
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

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">{t.payments.footnoteTitle}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t.payments.footnote}
        </p>
      </section>
    </div>
  );
}
