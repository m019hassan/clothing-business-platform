"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updateDeliveryAction, type DeliveryFormState } from "@/modules/delivery/application/actions";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import type { DeliveryStatus } from "@prisma/client";

const initialState: DeliveryFormState = { ok: true, message: "" };

export type DeliveryRowLabels = {
  saving: string;
  refund?: string;
  refundConfirm?: string;
  refundFailed?: string;
  nextStatus: string;
  carrierPlaceholder: string;
  trackingPlaceholder: string;
  update: string;
  statusLabels: Record<string, string>;
  transitions: {
    PROCESSING: string;
    READY: string;
    SHIPPED: string;
    DELIVERED: string;
    CANCELLED: string;
  };
};

const inputClass =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export function DeliveryRowActions({
  deliveryId,
  orderId,
  status,
  allowedTransitions,
  carrier,
  trackingNumber,
  labels,
  canRefund,
  errors,
}: {
  deliveryId: string;
  orderId: string;
  status: DeliveryStatus;
  allowedTransitions: readonly DeliveryStatus[];
  carrier: string | null;
  trackingNumber: string | null;
  labels: DeliveryRowLabels;
  canRefund?: boolean;
  errors?: ApiErrorLabels;
}) {
  const [state, formAction, isPending] = useActionState(updateDeliveryAction, initialState);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const router = useRouter();
  const isTerminal = allowedTransitions.length === 0;

  async function refund() {
    if (!window.confirm(labels.refundConfirm ?? "Record a refund for this order?")) {
      return;
    }

    setRefunding(true);
    setRefundError(null);

    try {
      await apiRequest(`/api/orders/${orderId}/refund`, { method: "POST", body: JSON.stringify({}) });
      router.refresh();
    } catch (requestError) {
      setRefundError(apiErrorMessage(requestError, errors));
    } finally {
      setRefunding(false);
    }
  }

  if (status === "DELIVERED" && canRefund) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={refund}
          disabled={refunding}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {refunding ? labels.saving : labels.refund ?? "Refund"}
        </button>
        {refundError ? (
          <p role="alert" className="text-xs text-rose-700">
            {refundError}
          </p>
        ) : null}
      </div>
    );
  }

  if (isTerminal) {
    return <span className="text-xs font-medium text-slate-400">{labels.statusLabels[status] ?? status}</span>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={allowedTransitions[0]} aria-label={labels.nextStatus} className={inputClass}>
          {allowedTransitions.map((next) => (
            <option key={next} value={next}>
              {labels.transitions[next as keyof DeliveryRowLabels["transitions"]] ?? next}
            </option>
          ))}
        </select>
        <input
          name="carrier"
          defaultValue={carrier ?? ""}
          placeholder={labels.carrierPlaceholder}
          aria-label="Carrier"
          className={`${inputClass} w-28`}
        />
        <input
          name="trackingNumber"
          defaultValue={trackingNumber ?? ""}
          placeholder={labels.trackingPlaceholder}
          aria-label="Tracking number"
          className={`${inputClass} w-32`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isPending ? labels.saving : labels.update}
        </button>
      </div>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={["text-xs", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
