"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AddressView } from "@/modules/customers/application/addresses";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { OrderView } from "@/modules/order/types";

export type CheckoutLabels = {
  createdTitle: string;
  createdBody: string;
  paymentLine: string;
  notCreated: string;
  reservedNote: string;
  cancelNote: string;
  deliveryLine: string;
  viewOrder: string;
  allOrders: string;
  continueShopping: string;
  deliveryAddress: string;
  addressNote: string;
  noAddress: string;
  paymentMethod: string;
  cashOnDelivery: string;
  bankTransfer: string;
  paymentNote: string;
  creating: string;
  create: string;
  serverNote: string;
};

export function CheckoutButton({ addresses, labels }: { addresses: AddressView[]; labels: CheckoutLabels }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderView | null>(null);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH_ON_DELIVERY");

  async function createOrder() {
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{ order: OrderView }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          ...(addressId ? { addressId } : {}),
          paymentMethod,
        }),
      });
      setCreatedOrder(result.order);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
      // Re-sync with the backend so the page never shows a stale cart.
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (createdOrder) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="text-sm font-semibold text-emerald-800">{labels.createdTitle}</h3>
        <p className="mt-1 text-sm text-emerald-700">
          {labels.createdBody
            .replace("{number}", createdOrder.orderNumber)
            .replace("{status}", createdOrder.status.replaceAll("_", " "))
            .replace("{total}", String(createdOrder.totalAmount))
            .replace("{currency}", createdOrder.currency)}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-emerald-700">
          <li>
            {labels.paymentLine.replace(
              "{status}",
              createdOrder.payment ? createdOrder.payment.status.replaceAll("_", " ").toLowerCase() : labels.notCreated,
            )}
          </li>
          <li>{labels.reservedNote}</li>
          <li>{labels.cancelNote}</li>
          {createdOrder.deliveryAddress ? (
            <li>
              {labels.deliveryLine
                .replace("{recipient}", createdOrder.deliveryAddress.recipientName)
                .replace("{city}", createdOrder.deliveryAddress.city)
                .replace("{line1}", createdOrder.deliveryAddress.line1)}
            </li>
          ) : null}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/orders/${createdOrder.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {labels.viewOrder}
          </Link>
          <Link
            href="/orders"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            {labels.allOrders}
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            {labels.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.length > 0 ? (
        <div>
          <label htmlFor="addressId" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            {labels.deliveryAddress}
          </label>
          <select
            id="addressId"
            value={addressId}
            onChange={(event) => setAddressId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          >
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {(address.label ? `${address.label} — ` : "") + address.recipientName}, {address.city}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            {labels.addressNote}
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {labels.noAddress}
        </p>
      )}

      <div>
        <label htmlFor="paymentMethod" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {labels.paymentMethod}
        </label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        >
          <option value="CASH_ON_DELIVERY">{labels.cashOnDelivery}</option>
          <option value="BANK_TRANSFER">{labels.bankTransfer}</option>
        </select>
        <p className="mt-1 text-xs text-slate-400">
          {labels.paymentNote}
        </p>
      </div>

      <button
        type="button"
        onClick={createOrder}
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? labels.creating : labels.create}
      </button>
      <p className="text-xs text-slate-500">
        {labels.serverNote}
      </p>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
