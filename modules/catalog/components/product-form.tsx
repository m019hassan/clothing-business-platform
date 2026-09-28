"use client";

import { useActionState } from "react";

import {
  createProductAction,
  updateProductAction,
} from "@/modules/catalog/application/actions";
import type { CatalogFormState } from "@/modules/catalog/types";

const initialState: CatalogFormState = { ok: true, message: "" };

const STATUS_OPTIONS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: string;
  status: string;
  categoryId: string;
};

export type ProductFormLabels = {
  name: string;
  slug: string;
  slugHint: string;
  basePrice: string;
  status: string;
  category: string;
  selectCategory: string;
  inactive: string;
  description: string;
  optionalVariant: string;
  priceOverride: string;
  variantStatus: string;
  variantHint: string;
  saving: string;
  createProduct: string;
  saveChanges: string;
};

export function ProductForm({
  mode,
  product,
  categories,
  labels,
  statusLabels,
  suggestedVariantSku,
}: {
  mode: "create" | "edit";
  product?: ProductFormValues;
  categories: { id: string; name: string; isActive: boolean }[];
  labels: ProductFormLabels;
  statusLabels: Record<string, string>;
  /** Ready-to-use SKU for the optional first variant (create mode). */
  suggestedVariantSku: string;
}) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createProductAction : updateProductAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" && product?.id ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            {labels.name}
          </label>
          <input id="name" name="name" type="text" required defaultValue={product?.name ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>
            {labels.slug}
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            // Optional: the server generates one from the name when it is empty. The
            // pattern still checks a value the user did type.
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title={labels.slugHint}
            defaultValue={product?.slug ?? ""}
            placeholder="linen-shirt"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-400">{labels.slugHint}</p>
        </div>
        <div>
          <label htmlFor="basePrice" className={labelClass}>
            {labels.basePrice}
          </label>
          <input
            id="basePrice"
            name="basePrice"
            type="text"
            inputMode="decimal"
            required
            defaultValue={product?.basePrice ?? ""}
            placeholder="149.00"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            {labels.status}
          </label>
          <select id="status" name="status" defaultValue={product?.status ?? "DRAFT"} className={inputClass}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status] ?? status}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="categoryId" className={labelClass}>
            {labels.category}
          </label>
          <select id="categoryId" name="categoryId" required defaultValue={product?.categoryId ?? ""} className={inputClass}>
            <option value="" disabled>
              {labels.selectCategory}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " " + labels.inactive}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className={labelClass}>
            {labels.description}
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={product?.description ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {mode === "create" ? (
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {labels.optionalVariant}
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="variantSku" className={labelClass}>
                SKU
              </label>
              <input
                id="variantSku"
                name="variantSku"
                type="text"
                defaultValue={suggestedVariantSku}
                placeholder="SHIRT-M"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="variantSize" className={labelClass}>
                Size
              </label>
              <input id="variantSize" name="variantSize" type="text" className={inputClass} />
            </div>
            <div>
              <label htmlFor="variantColor" className={labelClass}>
                Color
              </label>
              <input id="variantColor" name="variantColor" type="text" className={inputClass} />
            </div>
            <div>
              <label htmlFor="variantPriceOverride" className={labelClass}>
                {labels.priceOverride}
              </label>
              <input
                id="variantPriceOverride"
                name="variantPriceOverride"
                type="text"
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="variantStatus" className={labelClass}>
                {labels.variantStatus}
              </label>
              <select id="variantStatus" name="variantStatus" defaultValue="ACTIVE" className={inputClass}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {labels.variantHint}
          </p>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? labels.saving : mode === "create" ? labels.createProduct : labels.saveChanges}
        </button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
