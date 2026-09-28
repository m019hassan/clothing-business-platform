"use client";

import { useActionState } from "react";

import { updateDeliveryAction, type DeliveryFormState } from "@/modules/delivery/application/actions";
import type { DeliveryStatus } from "@prisma/client";

const initialState: DeliveryFormState = { ok: true, message: "" };

export type DeliveryRowLabels = {
  saving: string;
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
  status,
  allowedTransitions,
  carrier,
  trackingNumber,
  labels,
}: {
  deliveryId: string;
  status: DeliveryStatus;
  allowedTransitions: readonly DeliveryStatus[];
  carrier: string | null;
  trackingNumber: string | null;
  labels: DeliveryRowLabels;
}) {
  const [state, formAction, isPending] = useActionState(updateDeliveryAction, initialState);
  const isTerminal = allowedTransitions.length === 0;

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
