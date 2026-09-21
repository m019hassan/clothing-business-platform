import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderActions } from "@/components/orders/order-actions";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getOrder } from "@/modules/order/application/orders";
import type { OrderView } from "@/modules/order/types";
import { AuthorizationError, NotFoundError } from "@/src/lib/errors";
import { formatDate, formatMoney } from "@/src/lib/format";

type OrderDetailProps = {
  params: Promise<{ id: string }>;
};

// Mirrors the documented customer cancellation policy enforced by the API:
// cancellation is allowed from these statuses within 24 hours of placement.
const CUSTOMER_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const CANCELLABLE_STATUSES = ["DRAFT", "PENDING_PAYMENT", "CONFIRMED"];

function canCustomerCancel(order: OrderView): boolean {
  const ageMs = Date.now() - new Date(order.createdAt).getTime();

  return CANCELLABLE_STATUSES.includes(order.status) && ageMs <= CUSTOMER_CANCELLATION_WINDOW_MS;
}

export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { id } = await params;

  let order: OrderView | null = null;
  let notCustomer = false;
  let loadError = false;

  try {
    order = await getOrder(account, id);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notCustomer = true;
    } else if (error instanceof NotFoundError) {
      notFound();
    } else {
      loadError = true;
    }
  }

  if (notCustomer) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Orders are available for customer accounts</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  if (loadError || order === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load this order</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
        <Link href="/orders" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          Back to orders
        </Link>
      </section>
    );
  }

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/orders" className="font-medium text-slate-600 hover:text-blue-700">
          Orders
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-slate-800">{order.orderNumber}</span>
      </div>

      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Order</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{order.orderNumber}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-slate-500">Placed {formatDate(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {formatMoney(order.totalAmount, order.currency)}
            </p>
            <p className="text-xs text-slate-500">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <OrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            canSubmit={order.status === "DRAFT"}
            canCancel={canCustomerCancel(order)}
          />
        </div>
      </section>

      {/* Items */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Items</h3>
          <p className="text-sm text-slate-500">
            Prices shown are the prices recorded when the order was placed.
          </p>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">Item</th>
                <th scope="col" className="px-6 py-3 text-right">Qty</th>
                <th scope="col" className="px-6 py-3 text-right">Unit price</th>
                <th scope="col" className="px-6 py-3 text-right">Discount</th>
                <th scope="col" className="px-6 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <Link href={`/products/${item.productId}`} className="font-medium text-slate-900 hover:text-blue-700">
                      {item.productName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {item.sku}
                      {[item.size, item.color].filter(Boolean).length > 0
                        ? ` · ${[item.size, item.color].filter(Boolean).join(" · ")}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-slate-700">
                    {formatMoney(item.unitPrice, order.currency)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">
                    {formatMoney(item.discountAmount, order.currency)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatMoney(item.lineTotal, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-100 sm:hidden">
          {order.items.map((item) => (
            <li key={item.id} className="p-5">
              <Link href={`/products/${item.productId}`} className="font-medium text-slate-900">
                {item.productName}
              </Link>
              <p className="text-xs text-slate-500">{item.sku}</p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>
                  {item.quantity} × {formatMoney(item.unitPrice, order.currency)}
                </p>
                {Number(item.discountAmount) > 0 ? (
                  <p>Discount {formatMoney(item.discountAmount, order.currency)}</p>
                ) : null}
                <p className="font-medium text-slate-900">
                  Subtotal {formatMoney(item.lineTotal, order.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Payment */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Payment</h3>
        {order.payment ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PaymentStatusBadge status={order.payment.status} />
              <span className="text-sm text-slate-700">
                {formatMoney(order.payment.amount, order.payment.currency)}
              </span>
              {order.payment.method ? (
                <span className="text-sm text-slate-500">
                  {order.payment.method.replaceAll("_", " ")}
                </span>
              ) : (
                <span className="text-sm text-slate-400">Method not selected</span>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {order.payment.status === "PENDING"
                ? "The payment outcome has not been recorded yet. The order stays reserved until it is."
                : order.payment.status === "APPROVED"
                  ? "Payment approved. The order is confirmed and stock has been consumed."
                  : "This payment was not completed; the order was cancelled and the reservation released."}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No payment record exists for this order.</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Payment methods (bank transfer, cash on delivery, online payment) are not selectable in the UI yet;
          only the recorded outcome is shown here.
        </p>
      </section>

      {/* Summary */}
      <section className="ml-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Summary</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(order.subtotalAmount, order.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {formatMoney(order.totalAmount, order.currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">Totals are stored with the order and are not recalculated.</p>
      </section>
    </div>
  );
}
