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

type VariantLabels = {
  saving: string;
  save: string;
  archive: string;
  archiving: string;
  available: string;
  sizePlaceholder: string;
  colorPlaceholder: string;
  pricePlaceholder: string;
  ariaSize: string;
  ariaColor: string;
  ariaPrice: string;
  ariaStatus: string;
};

function VariantEditRow({
  productId,
  variant,
  colors,
  sizes,
  labels,
  statusLabels,
}: {
  productId: string;
  colors: string[];
  sizes: { label: string; ageLabel: string }[];
  variant: VariantRow;
  labels: VariantLabels;
  statusLabels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState(updateVariantAction, initialState);
  const [archiveState, archiveAction, isArchiving] = useActionState(archiveVariantAction, initialState);


  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{variant.sku}</p>
        <p className="text-xs text-slate-500">{labels.available} {variant.availableQuantity}</p>
      </div>

      <form action={formAction} className="contents">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="variantId" value={variant.id} />
        <select name="size" defaultValue={variant.size ?? ""} aria-label={`${labels.ariaSize} ${variant.sku}`} className={inputClass}>
          <option value="">{labels.sizePlaceholder}</option>
          {sizes.map((size) => (
            <option key={size.label} value={size.label}>
              {size.label} — {size.ageLabel}
            </option>
          ))}
        </select>
        <select name="color" defaultValue={variant.color ?? ""} aria-label={`${labels.ariaColor} ${variant.sku}`} className={inputClass}>
          <option value="">{labels.colorPlaceholder}</option>
          {colors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        <input
          name="priceOverride"
          defaultValue={variant.priceOverride ?? ""}
          placeholder={labels.pricePlaceholder}
          inputMode="decimal"
          aria-label={`${labels.ariaPrice} ${variant.sku}`}
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={variant.status} aria-label={`${labels.ariaStatus} ${variant.sku}`} className={inputClass}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status] ?? status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {isPending ? labels.saving : labels.save}
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
          {isArchiving ? labels.archiving : labels.archive}
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

export function VariantManager({
  productId,
  variants,
  colors,
  sizes,
  labels,
  newLabels,
  statusLabels,
  suggestedSku,
}: {
  productId: string;
  variants: VariantRow[];
  colors: string[];
  sizes: { label: string; ageLabel: string }[];
  suggestedSku: string;
  labels: VariantLabels;
  newLabels: {
    addTitle: string;
    add: string;
    adding: string;
    empty: string;
    newSku: string;
    newSize: string;
    newColor: string;
    newPrice: string;
    newStatus: string;
    skuPlaceholder: string;
    skuHint: string;
    sizePlaceholder: string;
    colorPlaceholder: string;
    pricePlaceholder: string;
    quantityPlaceholder: string;
    newQuantity: string;
  };
  statusLabels: Record<string, string>;
}) {
  const [state, formAction, isPending] = useActionState(createVariantAction, initialState);

  // Existing variants may carry a colour typed before the library existed, so the row
  // selects offer the library plus the product's own values; the new-variant form
  // offers the library only.
  // Same idea for sizes: the library plus the product's own values.
  const rowSizes = (() => {
    const known = new Map(sizes.map((size) => [size.label, size]));
    const extras = variants
      .map((variant) => variant.size)
      .filter((size): size is string => Boolean(size) && !known.has(size as string));

    return [...sizes, ...extras.map((label) => ({ label, ageLabel: "" }))];
  })();

  const rowColors = Array.from(
    new Set([...colors, ...variants.map((variant) => variant.color).filter((color): color is string => Boolean(color))]),
  );

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {variants.length === 0 ? (
          <li className="px-5 py-6 text-sm text-slate-500">{newLabels.empty}</li>
        ) : (
          variants.map((variant) => (
            <VariantEditRow
              key={variant.id}
              productId={productId}
              variant={variant}
              colors={rowColors}
              sizes={rowSizes}
              labels={labels}
              statusLabels={statusLabels}
            />
          ))
        )}
      </ul>

      <form action={formAction} className="rounded-xl border border-slate-200 p-4">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{newLabels.addTitle}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input
            name="sku"
            defaultValue={suggestedSku}
            placeholder={newLabels.skuPlaceholder}
            aria-label={newLabels.newSku}
            className={inputClass}
          />
          <select name="size" required aria-label={newLabels.newSize} className={inputClass}>
            <option value="">{newLabels.sizePlaceholder}</option>
            {sizes.map((size) => (
              <option key={size.label} value={size.label}>
                {size.label} — {size.ageLabel}
              </option>
            ))}
          </select>
          <select name="color" required aria-label={newLabels.newColor} className={inputClass}>
            <option value="">{newLabels.colorPlaceholder}</option>
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <input
            name="priceOverride"
            placeholder={newLabels.pricePlaceholder}
            inputMode="decimal"
            aria-label={newLabels.newPrice}
            className={inputClass}
          />
          <input
            name="quantity"
            placeholder={newLabels.quantityPlaceholder}
            inputMode="numeric"
            aria-label={newLabels.newQuantity}
            className={inputClass}
          />
          <select name="status" defaultValue="ACTIVE" aria-label={newLabels.newStatus} className={inputClass}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status] ?? status}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-400">{newLabels.skuHint}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? newLabels.adding : newLabels.add}
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
