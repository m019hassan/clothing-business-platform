"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { PaymentSimulationResult } from "@/modules/payment/types";

export function PaymentActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<null | "success" | "failure">(null);
  const [error, setError] = useState<string | null>(null);

  async function record(outcome: "success" | "failure") {
    if (
      outcome === "failure" &&
      !window.confirm("Record this payment as failed? The order will be cancelled and its reservation released.")
    ) {
      return;
    }

    setPending(outcome);
    setError(null);

    try {
      await apiRequest<PaymentSimulationResult>(`/api/orders/${orderId}/payment-simulation`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      });

      router.refresh();
    } catch (requestError) {
      if (requestError instanceof Error && "status" in requestError && (requestError as { status: number }).status === 409) {
        setError("This order is no longer awaiting a payment outcome.");
      } else {
        setError(apiErrorMessage(requestError));
      }

      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => record("success")}
          disabled={pending !== null}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "success" ? "Approving…" : "Approve payment"}
        </button>
        <button
          type="button"
          onClick={() => record("failure")}
          disabled={pending !== null}
          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "failure" ? "Rejecting…" : "Reject payment"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="max-w-xs text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
