"use client";

import { useActionState } from "react";

import { adjustStockAction, type AdjustmentFormState } from "@/modules/inventory/application/actions";

const initialState: AdjustmentFormState = { ok: true, message: "" };

const inputClass =
  "rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export function StockAdjustForm({
  variantId,
  warehouseId,
  sku,
}: {
  variantId: string;
  warehouseId: string;
  sku: string;
}) {
  const [state, formAction, isPending] = useActionState(adjustStockAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input
        name="quantityChange"
        type="number"
        step={1}
        required
        placeholder="±qty"
        aria-label={`Adjustment for ${sku}`}
        className={`${inputClass} w-20`}
      />
      <input
        name="reason"
        type="text"
        placeholder="Reason"
        aria-label={`Adjustment reason for ${sku}`}
        className={`${inputClass} w-36`}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Adjust"}
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
