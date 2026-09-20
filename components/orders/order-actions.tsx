"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderView } from "@/modules/order/types";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";

export function OrderActions({
  orderId,
  canSubmit,
  canCancel,
}: {
  orderId: string;
  canSubmit: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<null | "submit" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!canCancel && !canSubmit) {
    return null;
  }

  return (
    <div className="space-y-3">
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
