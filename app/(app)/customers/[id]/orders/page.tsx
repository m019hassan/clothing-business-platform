import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCustomerOrders } from "@/modules/customers/application/customers";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type CustomerOrdersPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

function bounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? String(fallback));

  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export default async function CustomerOrdersPage({ params, searchParams }: CustomerOrdersPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.CUSTOMERS_VIEW)) {
    redirect("/customers");
  }

  const { id } = await params;
  const query = await searchParams;
  const offset = bounded(query.offset, 0, 0, 1_000_000);
  const limit = bounded(query.limit, PAGE_SIZE, 1, 100);

  let page: Awaited<ReturnType<typeof listCustomerOrders>> | null = null;

  try {
    page = await listCustomerOrders(account, id, { limit, offset });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const { orders, pagination } = page;
  const rangeStart = orders.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + orders.length;
  const hasNext = offset + orders.length < pagination.total;
  const currency = orders[0]?.currency ?? "EGP";

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/customers/${id}`} className="text-sm text-blue-700 hover:underline">
          ← {t.customers.title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          {t.customers.invoicesTitle} — {page.customerName}
        </h1>
        <p className="text-sm text-slate-600">{t.customers.invoicesSubtitle}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.customers.invoicesCount}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{pagination.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.customers.invoicesTotalValue}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {formatMoney(pagination.totalSpent, currency)}
          </p>
        </div>
      </section>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          {t.customers.invoicesEmpty}
        </p>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.common.order}</th>
                  <th scope="col" className="px-6 py-3">{t.common.status}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.common.total}</th>
                  <th scope="col" className="px-6 py-3">{t.common.placed}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="font-medium text-slate-900 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order.status} labels={t.orderStatus} />
                    </td>
                    <td className="px-6 py-4 text-end text-slate-800">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              {t.common.showing} <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> /{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {offset > 0 ? (
                <Link
                  href={`/customers/${id}/orders?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.previous}
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/customers/${id}/orders?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.next}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.next}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
