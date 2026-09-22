"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AddressView } from "@/modules/customers/application/addresses";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { OrderView } from "@/modules/order/types";

export function CheckoutButton({ addresses }: { addresses: AddressView[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderView | null>(null);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "");

  async function createOrder() {
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{ order: OrderView }>("/api/orders", {
        method: "POST",
        body: addressId ? JSON.stringify({ addressId }) : undefined,
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
        <h3 className="text-sm font-semibold text-emerald-800">Order created</h3>
        <p className="mt-1 text-sm text-emerald-700">
          Your order <span className="font-semibold">{createdOrder.orderNumber}</span> was created with status{" "}
          {createdOrder.status.replaceAll("_", " ")} for {createdOrder.totalAmount} {createdOrder.currency}.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-emerald-700">
          <li>
            Payment: {createdOrder.payment ? createdOrder.payment.status.replaceAll("_", " ").toLowerCase() : "not created"}
          </li>
          <li>The items stay reserved until the payment outcome is recorded.</li>
          <li>You can cancel the order from its page within 24 hours.</li>
          {createdOrder.deliveryAddress ? (
            <li>
              Delivery to {createdOrder.deliveryAddress.recipientName}, {createdOrder.deliveryAddress.city} (
              {createdOrder.deliveryAddress.line1}).
            </li>
          ) : null}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/orders/${createdOrder.id}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            View order
          </Link>
          <Link
            href="/orders"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            All orders
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          >
            Continue shopping
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
            Delivery address
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
            Manage your addresses from the account page. The order stores a copy, so later edits will not change it.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No delivery address saved yet. You can add one from the account page, or continue without one.
        </p>
      )}

      <button
        type="button"
        onClick={createOrder}
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating order…" : "Create order"}
      </button>
      <p className="text-xs text-slate-500">
        Prices, totals and inventory are calculated by the server. Nothing is sent from this page except the
        request to create the order.
      </p>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
