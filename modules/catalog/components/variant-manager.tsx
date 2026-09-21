"use client";

import { useActionState } from "react";

import {
  archiveVariantAction,
  createVariantAction,
  updateVariantAction,
} from "@/modules/catalog/application/actions";
import type { CatalogFormState } from "@/modules/catalog/types";

const initialState: CatalogFormState = { ok: true, message: "" };

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export type VariantRow = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceOverride: string | null;
  status: string;
  availableQuantity: number;
};

function VariantEditRow({ productId, variant }: { productId: string; variant: VariantRow }) {
  const [state, formAction, isPending] = useActionState(updateVariantAction, initialState);
  const [archiveState, archiveAction, isArchiving] = useActionState(archiveVariantAction, initialState);

  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{variant.sku}</p>
        <p className="text-xs text-slate-500">Available: {variant.availableQuantity}</p>
      </div>

      <form action={formAction} className="contents">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variant.id} />
        <input name="size" defaultValue={variant.size ?? ""} placeholder="Size" aria-label={`Size for ${variant.sku}`} className={inputClass} />
        <input name="color" defaultValue={variant.color ?? ""} placeholder="Color" aria-label={`Color for ${variant.sku}`} className={inputClass} />
        <input
          name="priceOverride"
          defaultValue={variant.priceOverride ?? ""}
          placeholder="Price"
          inputMode="decimal"
          aria-label={`Price override for ${variant.sku}`}
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={variant.status} aria-label={`Status for ${variant.sku}`} className={inputClass}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <form action={archiveAction} className="sm:justify-self-end">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variant.id} />
        <button
          type="submit"
          disabled={isArchiving}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {isArchiving ? "Archiving…" : "Archive"}
        </button>
      </form>

      {state.message && !state.ok ? (
        <p role="alert" className="text-xs text-rose-700 sm:col-span-5">
          {state.message}
        </p>
      ) : null}
      {archiveState.message && !archiveState.ok ? (
        <p role="alert" className="text-xs text-rose-700 sm:col-span-5">
          {archiveState.message}
        </p>
      ) : null}
    </li>
  );
}

export function VariantManager({ productId, variants }: { productId: string; variants: VariantRow[] }) {
  const [state, formAction, isPending] = useActionState(createVariantAction, initialState);

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {variants.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">No variants yet.</li>
        ) : (
          variants.map((variant) => (
            <VariantEditRow key={variant.id} productId={productId} variant={variant} />
          ))
        )}
      </ul>

      <form action={formAction} className="rounded-xl border border-slate-200 p-4">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add a variant</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input name="sku" required placeholder="SKU" aria-label="New variant SKU" className={inputClass} />
          <input name="size" placeholder="Size" aria-label="New variant size" className={inputClass} />
          <input name="color" placeholder="Color" aria-label="New variant color" className={inputClass} />
          <input
            name="priceOverride"
            placeholder="Price override"
            inputMode="decimal"
            aria-label="New variant price override"
            className={inputClass}
          />
          <select name="status" defaultValue="ACTIVE" aria-label="New variant status" className={inputClass}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add variant"}
          </button>
          {state.message ? (
            <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
