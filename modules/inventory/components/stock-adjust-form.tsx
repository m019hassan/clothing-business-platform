"use client";

import { useActionState } from "react";

import { adjustStockAction, type AdjustmentFormState } from "@/modules/inventory/application/actions";

const initialState: AdjustmentFormState = { ok: true, message: "" };

const inputClass =
  "rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export type StockAdjustLabels = {
  adjustPlaceholder: string;
  reasonPlaceholder: string;
  adjustAria: string;
  reasonAria: string;
  adjust: string;
  saving: string;
};

export function StockAdjustForm({
  variantId,
  warehouseId,
  sku,
  labels,
}: {
  variantId: string;
  /** Optional: without it the service uses the account's branch warehouse. */
  warehouseId?: string;
  sku: string;
  labels: StockAdjustLabels;
}) {
  const [state, formAction, isPending] = useActionState(adjustStockAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      {warehouseId ? <input type="hidden" name="warehouseId" value={warehouseId} /> : null}
      <input
        name="quantityChange"
        type="number"
        step={1}
        required
        placeholder={labels.adjustPlaceholder}
        aria-label={labels.adjustAria.replace("{sku}", sku)}
        className={`${inputClass} w-20`}
      />
      <input
        name="reason"
        type="text"
        placeholder={labels.reasonPlaceholder}
        aria-label={labels.reasonAria.replace("{sku}", sku)}
        className={`${inputClass} w-36`}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        {isPending ? labels.saving : labels.adjust}
      </button>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={["w-full text-xs", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
