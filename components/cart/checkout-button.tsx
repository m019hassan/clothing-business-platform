"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { OrderView } from "@/modules/order/types";

export function CheckoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderView | null>(null);

  async function createOrder() {
    setPending(true);
    setError(null);

    try {
      const result = await apiRequest<{ order: OrderView }>("/api/orders", { method: "POST" });
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
