"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BarcodeSelectAll } from "@/modules/catalog/components/barcode-select-all";

type ProductOption = { id: string; name: string };

export type DiscountsFormLabels = {
  create: string;
  name: string;
  namePlaceholder: string;
  percent: string;
  startsAt: string;
  endsAt: string;
  products: string;
  searchProducts: string;
  selectAll: string;
  save: string;
  saving: string;
  created: string;
  failed: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

export function DiscountsCreateForm({
  products,
  labels,
}: {
  products: ProductOption[];
  labels: DiscountsFormLabels;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("15");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const term = filter.trim().toLowerCase();
  const visible = term ? products.filter((product) => product.name.toLowerCase().includes(term)) : products;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const productIds = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name="productIds"]:checked'),
    ).map((box) => box.value);

    setBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          percent: Number(percent),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          productIds,
        }),
      });

      if (!response.ok) {
        throw new Error("failed");
      }

      setMessage(labels.created);
      setName("");
      setFilter("");
      form.querySelectorAll<HTMLInputElement>('input[name="productIds"]').forEach((box) => {
        box.checked = false;
      });
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(labels.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">{labels.create}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="promotion-name" className={labelClass}>
            {labels.name}
          </label>
          <input
            id="promotion-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={labels.namePlaceholder}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="promotion-percent" className={labelClass}>
            {labels.percent}
          </label>
          <input
            id="promotion-percent"
            type="number"
            required
            min={1}
            max={90}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="promotion-start" className={labelClass}>
            {labels.startsAt}
          </label>
          <input
            id="promotion-start"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="promotion-end" className={labelClass}>
            {labels.endsAt}
          </label>
          <input
            id="promotion-end"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className={labelClass}>{labels.products}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={labels.searchProducts}
            aria-label={labels.searchProducts}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <BarcodeSelectAll label={labels.selectAll} checkboxName="productIds" />
        </div>
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {visible.map((product) => (
            <li key={product.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <input type="checkbox" name="productIds" value={product.id} className="h-4 w-4 rounded border-slate-300" />
              <span className="text-slate-800">{product.name}</span>
            </li>
          ))}
          {visible.length === 0 ? <li className="px-3 py-6 text-center text-sm text-slate-400">—</li> : null}
        </ul>
      </div>

      {message ? (
        <p className={["text-sm", isError ? "text-rose-700" : "text-emerald-700"].join(" ")}>{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? labels.saving : labels.save}
      </button>
    </form>
  );
}
