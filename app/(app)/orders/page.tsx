import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listOrders } from "@/modules/order/application/orders";
import type { OrderSummaryView } from "@/modules/order/types";
import { AuthorizationError } from "@/src/lib/errors";
import { formatDate, formatMoney } from "@/src/lib/format";

const PAGE_SIZE = 10;

type OrdersPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);

  let orders: OrderSummaryView[] = [];
  let total = 0;
  let notCustomer = false;
  let loadError = false;

  try {
    const page = await listOrders(account, { limit, offset });
    orders = page.orders;
    total = page.pagination.total;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notCustomer = true;
    } else {
      loadError = true;
    }
  }

  if (notCustomer) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Orders are available for customer accounts</p>
        <p className="mt-1 text-sm text-slate-500">Staff order management is a later phase.</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load your orders</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const hasPrevious = offset > 0;
  const hasNext = offset + orders.length < total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Purchases</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Orders</h2>
        <p className="mt-1 text-sm text-slate-600">
          {total} order{total === 1 ? "" : "s"} placed with this account.
        </p>
      </section>

      {orders.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-800">No orders yet</p>
          <p className="mt-1 text-sm text-slate-500">Orders you place will appear here.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Browse products
          </Link>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Order</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Total</th>
                  <th scope="col" className="px-6 py-3">Created</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">
                      {formatMoney(order.totalAmount, order.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mobile cards */}
          <section className="space-y-3 lg:hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(order.totalAmount, order.currency)}
                  </span>
                </div>
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Page <span className="font-medium text-slate-900">{currentPage}</span> of{" "}
              <span className="font-medium text-slate-900">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/orders?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Previous</span>
              )}
              {hasNext ? (
                <Link
                  href={`/orders?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Next</span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
