"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderView } from "@/modules/order/types";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";

export type OrderActionLabels = {
  cancelConfirm: string;
  cannotCancel: string;
  cannotSubmit: string;
  submittedTitle: string;
  submittedBody: string;
  viewOrderStatus: string;
  allOrders: string;
  waiting: string;
  waitingHint: string;
  submitting: string;
  submit: string;
  cancelling: string;
  cancel: string;
};

export function OrderActions({
  orderId,
  orderNumber,
  status,
  canSubmit,
  canCancel,
  labels,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  canSubmit: boolean;
  canCancel: boolean;
  labels: OrderActionLabels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<null | "submit" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function transition(nextStatus: "PENDING_PAYMENT" | "CANCELLED") {
    if (nextStatus === "CANCELLED" && !window.confirm(labels.cancelConfirm)) {
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
          nextStatus === "CANCELLED" ? labels.cannotCancel : labels.cannotSubmit,
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
        <h3 className="text-sm font-semibold text-emerald-800">{labels.submittedTitle}</h3>
        <p className="mt-1 text-sm text-emerald-700">
          {labels.submittedBody.replace("{number}", orderNumber)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/orders/${orderId}`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {labels.viewOrderStatus}
          </Link>
          <Link
            href="/orders"
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 transition-colors hover:bg-white"
          >
            {labels.allOrders}
          </Link>
        </div>
      </div>
    );
  }

  if (!canCancel && !canSubmit) {
    return status === "PENDING_PAYMENT" ? (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {labels.waiting}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-3">
      {status === "PENDING_PAYMENT" ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {labels.waitingHint}
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
            {pending === "submit" ? labels.submitting : labels.submit}
          </button>
        ) : null}

        {canCancel ? (
          <button
            type="button"
            onClick={() => transition("CANCELLED")}
            disabled={pending !== null}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending === "cancel" ? labels.cancelling : labels.cancel}
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
