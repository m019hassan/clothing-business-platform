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
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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
  const { t } = await getInterfaceLanguage();

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
        <p className="text-sm font-semibold text-slate-800">{t.orders.notCustomerTitle}</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  if (loadError || order === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.orderDetail.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
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
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.orderDetail.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{order.orderNumber}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} labels={t.orderStatus} />
              <span className="text-sm text-slate-500">{t.orderDetail.placed} {formatDate(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.common.total}</p>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {formatMoney(order.totalAmount, order.currency)}
            </p>
            <p className="text-xs text-slate-500">
              {itemCount} {itemCount === 1 ? t.cart.itemSingular : t.cart.itemPlural}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <OrderActions
            labels={t.orderActions}
            errors={t.errors}
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
          <h3 className="text-base font-semibold text-slate-900">{t.orderDetail.itemsTitle}</h3>
          <p className="text-sm text-slate-500">
            Prices shown are the prices recorded when the order was placed.
          </p>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">{t.checkout.item}</th>
                <th scope="col" className="px-6 py-3 text-end">{t.common.qty}</th>
                <th scope="col" className="px-6 py-3 text-end">{t.common.unitPrice}</th>
                <th scope="col" className="px-6 py-3 text-end">{t.common.discount}</th>
                <th scope="col" className="px-6 py-3 text-end">{t.common.subtotal}</th>
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
                  <td className="px-6 py-4 text-end text-slate-700">{item.quantity}</td>
                  <td className="px-6 py-4 text-end text-slate-700">
                    {formatMoney(item.unitPrice, order.currency)}
                  </td>
                  <td className="px-6 py-4 text-end text-slate-700">
                    {formatMoney(item.discountAmount, order.currency)}
                  </td>
                  <td className="px-6 py-4 text-end font-medium text-slate-900">
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
                  <p>{t.orderDetail.discountLine.replace("{amount}", formatMoney(item.discountAmount, order.currency))}</p>
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
        <h3 className="text-base font-semibold text-slate-900">{t.common.payment}</h3>
        {order.delivery ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-slate-900">{t.orderDetail.delivery}</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {(t.deliveryStatus as Record<string, string>)[order.delivery.status] ?? order.delivery.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.carrier}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.delivery.carrier ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.tracking}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.delivery.trackingNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.dispatched}</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {order.delivery.dispatchedAt ? formatDate(order.delivery.dispatchedAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.delivered}</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {order.delivery.deliveredAt ? formatDate(order.delivery.deliveredAt) : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">
              {t.orderDetail.deliveryPanelNote}
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">{t.orderDetail.delivery}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t.orderDetail.noDeliveryNote}
            </p>
          </section>
        )}

        {order.deliveryAddress ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">{t.orderDetail.deliveryAddress}</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.recipient}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.deliveryAddress.recipientName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.phone}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.deliveryAddress.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.city}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.deliveryAddress.city}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.country}</dt>
                <dd className="mt-1 text-sm text-slate-800">{order.deliveryAddress.country}</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.orderDetail.address}</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {order.deliveryAddress.line1}
                  {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ""}
                  {order.deliveryAddress.region ? `, ${order.deliveryAddress.region}` : ""}
                  {order.deliveryAddress.postalCode ? ` ${order.deliveryAddress.postalCode}` : ""}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">{t.orderDetail.deliveryAddress}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t.orderDetail.noAddressNote}
            </p>
          </section>
        )}

        {order.payment ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PaymentStatusBadge status={order.payment.status} labels={t.paymentStatus} />
              <span className="text-sm text-slate-700">
                {formatMoney(order.payment.amount, order.payment.currency)}
              </span>
              {order.payment.method ? (
                <span className="text-sm text-slate-500">
                  {(t.paymentMethod as Record<string, string>)[order.payment.method] ??
                    order.payment.method.replaceAll("_", " ")}
                </span>
              ) : (
                <span className="text-sm text-slate-400">{t.orderDetail.methodNotSelected}</span>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {order.payment.status === "PENDING"
                ? t.orderDetail.pendingNote
                : order.payment.status === "APPROVED"
                  ? t.orderDetail.paymentApproved
                  : t.orderDetail.failedNote}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {order.payment.method === "BANK_TRANSFER"
                ? t.orderDetail.bankTransferNote
                : order.payment.method === "CASH_ON_DELIVERY"
                  ? t.orderDetail.codNote
                  : order.payment.method === "CASH"
                    ? t.orderDetail.cashCounter
                    : t.orderDetail.noMethod}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">{t.orderDetail.noPaymentRecord}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {t.orderDetail.methodFootnote}
        </p>
      </section>

      {/* Summary */}
      <section className="ms-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">{t.orderDetail.summaryTitle}</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600">{t.common.subtotal}</dt>
            <dd className="font-medium text-slate-900">
              {formatMoney(order.subtotalAmount, order.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <dt className="font-semibold text-slate-900">{t.common.total}</dt>
            <dd className="text-lg font-semibold text-slate-900">
              {formatMoney(order.totalAmount, order.currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">{t.orderDetail.totalsNote}</p>
      </section>
    </div>
  );
}
