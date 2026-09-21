"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderView } from "@/modules/order/types";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";

export function OrderActions({
  orderId,
  orderNumber,
  status,
  canSubmit,
  canCancel,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  canSubmit: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<null | "submit" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function transition(nextStatus: "PENDING_PAYMENT" | "CANCELLED") {
    if (nextStatus === "CANCELLED" && !window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setPending(nextStatus === "CANCELLED" ? "cancel" : "submit");
    setError(null);

    try {
      await apiRequest<{ order: OrderView }>(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (nextStatus === "PENDING_PAYMENT") {
        setSubmitted(true);
      }

      router.refresh();
    } catch (requestError) {
      if (requestError instanceof Error && "status" in requestError && (requestError as { status: number }).status === 409) {
        setError(
          nextStatus === "CANCELLED"
            ? "This order can no longer be cancelled."
            : "This order can no longer be submitted for payment.",
        );
      } else {
        setError(apiErrorMessage(requestError));
      }

      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="text-sm font-semibold text-emerald-800">Submitted for payment</h3>
        <p className="mt-1 text-sm text-emerald-700">
          Order <span className="font-semibold">{orderNumber}</span> is now waiting for a payment outcome.
          The items stay reserved while the payment is pending, and the order is confirmed once the payment
          is approved.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/orders/${orderId}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            View order status
          </Link>
          <Link
            href="/orders"
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-white"
          >
            All orders
          </Link>
        </div>
      </div>
    );
  }

  if (!canCancel && !canSubmit) {
    return status === "PENDING_PAYMENT" ? (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        This order is waiting for a payment outcome.
      </p>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {status === "PENDING_PAYMENT" ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This order is waiting for a payment outcome. The reserved items are released if the payment is
          rejected.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSubmit ? (
          <button
            type="button"
            onClick={() => transition("PENDING_PAYMENT")}
            disabled={pending !== null}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "submit" ? "Submitting…" : "Submit for payment"}
          </button>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            onClick={() => transition("CANCELLED")}
            disabled={pending !== null}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "cancel" ? "Cancelling…" : "Cancel order"}
          </button>
        ) : null}
      </div>

      {canCancel ? (
        <p className="text-xs text-slate-500">
          Orders can be cancelled within 24 hours of placement.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
