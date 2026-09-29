"use client";

import { useActionState, useState } from "react";

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
  material?: string | null;
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
  chooseColor: string;
  chooseSize: string;
  chooseMaterial: string;
  material: string;
  variantsTitle: string;
  variantsHint: string;
  size: string;
  color: string;
  quantity: string;
  rowPrice: string;
  addRow: string;
  removeRow: string;
  variantStatus: string;
  variantHint: string;
  saving: string;
  createProduct: string;
  saveChanges: string;
};

type VariantRow = { key: string; size: string; color: string; quantity: string; price: string };

export function ProductForm({
  mode,
  product,
  categories,
  colors,
  sizes,
  materials,
  labels,
  statusLabels,
}: {
  mode: "create" | "edit";
  product?: ProductFormValues;
  categories: { id: string; name: string; isActive: boolean }[];
  colors: { id: string; name: string }[];
  sizes: { id: string; label: string; ageLabel: string }[];
  materials: { id: string; name: string }[];
  labels: ProductFormLabels;
  statusLabels: Record<string, string>;
}) {

  // Size/colour/quantity/price rows for the variants that ship with the product.
  const [rows, setRows] = useState<VariantRow[]>([{ key: "row-1", size: "", color: "", quantity: "", price: "" }]);

  const addRow = () =>
    setRows((current) => [...current, { key: `row-${Date.now()}-${current.length}`, size: "", color: "", quantity: "", price: "" }]);

  const removeRow = (index: number) => setRows((current) => current.filter((_, position) => position !== index));

  const updateRow = (index: number, patch: Partial<VariantRow>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)));
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
          <label htmlFor="material" className={labelClass}>
            {labels.material}
          </label>
          <select id="material" name="material" defaultValue={product?.material ?? ""} className={inputClass}>
            <option value="">{labels.chooseMaterial}</option>
            {materials.map((material) => (
              <option key={material.id} value={material.name}>
                {material.name}
              </option>
            ))}
            {product?.material && !materials.some((material) => material.name === product.material) ? (
              <option value={product.material}>{product.material}</option>
            ) : null}
          </select>
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
            {labels.variantsTitle}
          </legend>
          <p className="mt-1 text-xs text-slate-400">{labels.variantsHint}</p>

          <input type="hidden" name="variantsJson" value={JSON.stringify(rows)} />

          <div className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-5">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{labels.size}</span>
                  <select
                    value={row.size}
                    onChange={(event) => updateRow(index, { size: event.target.value })}
                    required
                    aria-label={labels.size}
                    className={inputClass}
                  >
                    <option value="">{labels.chooseSize}</option>
                    {sizes.map((size) => (
                      <option key={size.id} value={size.label}>
                        {size.label} — {size.ageLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{labels.color}</span>
                  <select
                    value={row.color}
                    onChange={(event) => updateRow(index, { color: event.target.value })}
                    required
                    aria-label={labels.color}
                    className={inputClass}
                  >
                    <option value="">{labels.chooseColor}</option>
                    {colors.map((color) => (
                      <option key={color.id} value={color.name}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{labels.quantity}</span>
                  <input
                    value={row.quantity}
                    onChange={(event) => updateRow(index, { quantity: event.target.value })}
                    inputMode="numeric"
                    placeholder="100"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{labels.rowPrice}</span>
                  <input
                    value={row.price}
                    onChange={(event) => updateRow(index, { price: event.target.value })}
                    inputMode="decimal"
                    placeholder="200"
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {labels.removeRow}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {labels.addRow}
          </button>
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
