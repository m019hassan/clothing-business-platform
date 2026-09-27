"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PaymentSimulationResult, PaymentView, PendingPaymentRow } from "@/modules/payment/types";
import { apiErrorMessage, apiRequest } from "@/src/lib/api";

type PaymentAction = "verify" | "approve" | "reject";

const CONFIRMATIONS: Partial<Record<PaymentAction, string>> = {
  reject: "Reject this payment? The order will be cancelled and its reservation released.",
};

export function PaymentActions({
  payment,
  canVerify,
  canApprove,
  canReject,
}: {
  payment: PendingPaymentRow;
  canVerify: boolean;
  canApprove: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PaymentAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = payment.paymentStatus === "PENDING";
  const isSettleable = isPending || payment.paymentStatus === "PENDING_VERIFICATION";

  async function run(action: PaymentAction) {
    const confirmation = CONFIRMATIONS[action];

    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    setPending(action);
    setError(null);

    try {
      await apiRequest<PaymentView | PaymentSimulationResult>(`/api/payments/${payment.paymentId}/${action}`, {
        method: "POST",
      });

      router.refresh();
    } catch (requestError) {
      if (requestError instanceof Error && "status" in requestError && (requestError as { status: number }).status === 409) {
        setError("This order is no longer awaiting a payment decision.");
      } else {
        setError(apiErrorMessage(requestError));
      }

      router.refresh();
    } finally {
      setPending(null);
    }
  }

  const buttons: { action: PaymentAction; label: string; busy: string; className: string }[] = [];

  if (isPending && canVerify) {
    buttons.push({
      action: "verify",
      label: "Confirm transfer received",
      busy: "Recording…",
      className: "rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
    });
  }

  if (isSettleable && canApprove) {
    buttons.push({
      action: "approve",
      label: "Approve payment",
      busy: "Approving…",
      className: "rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60",
    });
  }

  if (isSettleable && canReject) {
    buttons.push({
      action: "reject",
      label: "Reject payment",
      busy: "Rejecting…",
      className: "rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60",
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {buttons.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {buttons.map((button) => (
            <button
              key={button.action}
              type="button"
              onClick={() => run(button.action)}
              disabled={pending !== null}
              className={button.className}
            >
              {pending === button.action ? button.busy : button.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No decision is available to your account.</p>
      )}

      {error ? (
        <p role="alert" className="max-w-xs text-right text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
