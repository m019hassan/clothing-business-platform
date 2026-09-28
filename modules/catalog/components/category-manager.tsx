"use client";

import { useActionState } from "react";

import {
  createCategoryAction,
  toggleCategoryAction,
} from "@/modules/catalog/application/actions";
import type { CatalogFormState, CategoryView } from "@/modules/catalog/types";

const initialState: CatalogFormState = { ok: true, message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export type CategoryManagerLabels = {
  title: string;
  subtitle: string;
  newTitle: string;
  namePlaceholder: string;
  slugPlaceholder: string;
  descriptionPlaceholder: string;
  create: string;
  creating: string;
  activate: string;
  deactivate: string;
  inactiveBadge: string;
  productSingular: string;
  productPlural: string;
  ariaName: string;
  ariaSlug: string;
  ariaDescription: string;
  saving: string;
};

function CategoryRow({ category, labels }: { category: CategoryView; labels: CategoryManagerLabels }) {
  const [state, formAction, isPending] = useActionState(toggleCategoryAction, initialState);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {category.name}
          {category.isActive ? null : (
            <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {labels.inactiveBadge}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {category.slug} · {category.productCount}{" "}
          {category.productCount === 1 ? labels.productSingular : labels.productPlural}
        </p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="categoryId" value={category.id} />
        <input type="hidden" name="isActive" value={category.isActive ? "false" : "true"} />
        <button
          type="submit"
          disabled={isPending}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
            category.isActive
              ? "border-rose-200 text-rose-700 hover:bg-rose-50"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          ].join(" ")}
        >
          {isPending ? labels.saving : category.isActive ? labels.deactivate : labels.activate}
        </button>
      </form>
      {state.message && !state.ok ? (
        <p role="alert" className="w-full text-xs text-rose-700">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}

export function CategoryManager({
  categories,
  labels,
}: {
  categories: CategoryView[];
  labels: CategoryManagerLabels;
}) {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-slate-900">{labels.title}</h3>
        <p className="text-sm text-slate-500">
          {labels.subtitle}
        </p>
      </div>

      <ul className="divide-y divide-slate-100">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} labels={labels} />
        ))}
      </ul>

      <form action={formAction} className="border-t border-slate-200 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.newTitle}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="name" required placeholder={labels.namePlaceholder} aria-label={labels.ariaName} className={inputClass} />
          <input name="slug" required placeholder={labels.slugPlaceholder} aria-label={labels.ariaSlug} className={inputClass} />
          <input name="description" placeholder={labels.descriptionPlaceholder} aria-label={labels.ariaDescription} className={inputClass} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {isPending ? labels.creating : labels.create}
          </button>
          {state.message ? (
            <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
