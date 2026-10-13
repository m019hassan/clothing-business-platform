"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/src/lib/api";
import { formatVariantAttributes } from "@/src/lib/format";

type VariantOption = {
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  imageId: string | null;
};

export type StockRequestDialogLabels = {
  open: string;
  title: string;
  hint: string;
  search: string;
  empty: string;
  basket: string;
  remove: string;
  note: string;
  notePlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  failed: string;
  units: string;
  sizeLabel: string;
};

export function StockRequestDialog({
  variants,
  labels,
}: {
  variants: VariantOption[];
  labels: StockRequestDialogLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<{ variantId: string; label: string; quantity: number }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (term
        ? variants.filter((variant) =>
            `${variant.productName} ${variant.sku} ${variant.size ?? ""} ${variant.color ?? ""}`
              .toLowerCase()
              .includes(term),
          )
        : variants
      ).slice(0, 40),
    [variants, term],
  );

  const inBasket = useMemo(() => new Set(lines.map((line) => line.variantId)), [lines]);
  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

  function openDialog() {
    setOpen(true);
    setQuery("");
    setLines([]);
    setNote("");
    setError(null);
    setDone(false);
  }

  function add(variant: VariantOption) {
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.variantId);

      if (existing) {
        return current.map((line) =>
          line.variantId === variant.variantId ? { ...line, quantity: Math.min(999, line.quantity + 1) } : line,
        );
      }

      return [
        ...current,
        {
          variantId: variant.variantId,
          label: `${variant.productName} · ${formatVariantAttributes(variant.size, variant.color, "—")} · ${variant.sku}`,
          quantity: 1,
        },
      ];
    });
  }

  function setQuantity(variantId: string, value: number) {
    setLines((current) =>
      current.map((line) =>
        line.variantId === variantId ? { ...line, quantity: Math.max(1, Math.min(999, value || 1)) } : line,
      ),
    );
  }

  function remove(variantId: string) {
    setLines((current) => current.filter((line) => line.variantId !== variantId));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiRequest("/api/stock-requests", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
          note: note.trim() === "" ? null : note.trim(),
        }),
      });
      setDone(true);
      setBusy(false);
      router.refresh();
      setTimeout(() => setOpen(false), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
      >
        📦 {labels.open}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={submit}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{labels.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              <div className="flex min-h-0 flex-col gap-2">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.search}
                  aria-label={labels.search}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                {visible.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{labels.empty}</p>
                ) : (
                  <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {visible.map((variant) => (
                      <li key={variant.variantId}>
                        <button
                          type="button"
                          onClick={() => add(variant)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start transition-colors hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {variant.imageId ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`/api/products/images/${variant.imageId}`}
                                alt={variant.productName}
                                className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
                              />
                            ) : (
                              <span className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                            )}
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-medium text-slate-900">{variant.productName}</span>
                                {variant.size ? (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    {labels.sizeLabel} {variant.size}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                {variant.color ? (
                                  <>
                                    <span
                                      className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-slate-300"
                                      style={{ backgroundColor: variant.colorHex ?? "transparent" }}
                                    />
                                    <span>{variant.color}</span>
                                  </>
                                ) : null}
                                <span className="truncate font-mono text-[11px] text-slate-400">{variant.sku}</span>
                              </span>
                            </span>
                          </span>
                          <span
                            className={[
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                              inBasket.has(variant.variantId) ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500",
                            ].join(" ")}
                          >
                            {inBasket.has(variant.variantId) ? "✓" : "+"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  {labels.basket} ({lines.length} — {totalUnits} {labels.units})
                </p>
                {lines.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">—</p>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {lines.map((line) => (
                      <li key={line.variantId} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{line.label}</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={line.quantity}
                          onChange={(event) => setQuantity(line.variantId, Number(event.target.value))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                          aria-label={labels.units}
                        />
                        <button
                          type="button"
                          onClick={() => remove(line.variantId)}
                          className="shrink-0 text-xs text-rose-600 hover:underline"
                        >
                          {labels.remove}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder={labels.notePlaceholder}
                  aria-label={labels.note}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />

                {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
                {done ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{labels.success}</p> : null}

                <button
                  type="submit"
                  disabled={busy || lines.length === 0 || done}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy ? labels.submitting : labels.submit}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
