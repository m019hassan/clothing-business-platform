"use client";

import { useActionState } from "react";

import { updateDeliveryAction, type DeliveryFormState } from "@/modules/delivery/application/actions";
import type { DeliveryStatus } from "@prisma/client";

const initialState: DeliveryFormState = { ok: true, message: "" };

const NEXT_STATUS_LABELS: Record<string, string> = {
  PROCESSING: "Start processing",
  READY: "Mark ready",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel delivery",
};

const inputClass =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export function DeliveryRowActions({
  deliveryId,
  status,
  allowedTransitions,
  carrier,
  trackingNumber,
}: {
  deliveryId: string;
  status: DeliveryStatus;
  allowedTransitions: readonly DeliveryStatus[];
  carrier: string | null;
  trackingNumber: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateDeliveryAction, initialState);
  const isTerminal = allowedTransitions.length === 0;

  if (isTerminal) {
    return <span className="text-xs font-medium text-slate-400">{status}</span>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="status" defaultValue={allowedTransitions[0]} aria-label="Next status" className={inputClass}>
          {allowedTransitions.map((next) => (
            <option key={next} value={next}>
              {NEXT_STATUS_LABELS[next] ?? next}
            </option>
          ))}
        </select>
        <input
          name="carrier"
          defaultValue={carrier ?? ""}
          placeholder="Carrier"
          aria-label="Carrier"
          className={`${inputClass} w-28`}
        />
        <input
          name="trackingNumber"
          defaultValue={trackingNumber ?? ""}
          placeholder="Tracking"
          aria-label="Tracking number"
          className={`${inputClass} w-32`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Update"}
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
