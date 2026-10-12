"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/src/lib/api";
import { formatVariantAttributes } from "@/src/lib/format";

type BalanceOption = {
  variantId: string;
  productName: string;
  size: string | null;
  color: string | null;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  branchId: string | null;
  availableQuantity: number;
};

type TargetOption = { branchId: string; branchName: string; branchCode: string };

export type StockTransferLauncherLabels = {
  open: string;
  title: string;
  hint: string;
  pickTitle: string;
  detailsTitle: string;
  search: string;
  none: string;
  back: string;
  toBranch: string;
  quantity: string;
  all: string;
  availableHere: string;
  from: string;
  confirm: string;
  cancel: string;
  noTargets: string;
  done: string;
  autoWarehouse: string;
};

/**
 * The guided move flow: one obvious button on the inventory page, then two steps —
 * pick the item, then the destination branch and quantity. The destination
 * warehouse is resolved by the server.
 */
export function StockTransferLauncher({
  balances,
  targets,
  labels,
}: {
  balances: BalanceOption[];
  targets: TargetOption[];
  labels: StockTransferLauncherLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BalanceOption | null>(null);
  const [toBranchId, setToBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const term = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (term
        ? balances.filter((row) => `${row.productName} ${row.sku} ${row.warehouseName}`.toLowerCase().includes(term))
        : balances
      ).slice(0, 60),
    [balances, term],
  );

  const options = selected ? targets.filter((target) => target.branchId !== selected.branchId) : [];

  function openDialog() {
    setOpen(true);
    setStep(1);
    setQuery("");
    setSelected(null);
    setToBranchId("");
    setQuantity("");
    setError(null);
    setDone(false);
  }

  function pickBalance(balance: BalanceOption) {
    setSelected(balance);
    setToBranchId(targets.find((target) => target.branchId !== balance.branchId)?.branchId ?? "");
    setQuantity("");
    setError(null);
    setStep(2);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest("/api/inventory/transfer", {
        method: "POST",
        body: JSON.stringify({
          variantId: selected.variantId,
          fromWarehouseId: selected.warehouseId,
          toBranchId,
          quantity: Number(quantity),
        }),
      });
      setDone(true);
      setBusy(false);
      router.refresh();
      setTimeout(() => setOpen(false), 1600);
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
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
      >
        🔁 {labels.open}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">{labels.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{labels.hint}</p>
            </div>

            {step === 1 ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
                <p className="text-sm font-semibold text-slate-800">{labels.pickTitle}</p>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.search}
                  aria-label={labels.search}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                {visible.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{labels.none}</p>
                ) : (
                  <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {visible.map((row) => (
                      <li key={`${row.variantId}-${row.warehouseId}`}>
                        <button
                          type="button"
                          onClick={() => pickBalance(row)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start transition-colors hover:bg-slate-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">
                              {row.productName} · {formatVariantAttributes(row.size, row.color, "—")}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {row.sku} · {row.warehouseName} ({row.warehouseCode})
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {row.availableQuantity}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
                <p className="text-sm font-semibold text-slate-800">{labels.detailsTitle}</p>

                {selected ? (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      {selected.productName} · {formatVariantAttributes(selected.size, selected.color, "—")}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">{selected.sku}</p>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <span>
                        {labels.from}: <b className="text-slate-700">{selected.warehouseName} ({selected.warehouseCode})</b>
                      </span>
                      <span>
                        {labels.availableHere}: <b className="text-slate-700">{selected.availableQuantity}</b>
                      </span>
                    </div>
                  </div>
                ) : null}

                {options.length === 0 ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{labels.noTargets}</p>
                ) : (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">{labels.toBranch}</span>
                      <select
                        value={toBranchId}
                        onChange={(event) => setToBranchId(event.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                      >
                        {options.map((target) => (
                          <option key={target.branchId} value={target.branchId}>
                            {target.branchName} ({target.branchCode})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-400">{labels.autoWarehouse}</p>
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">{labels.quantity}</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={quantity}
                          onChange={(event) => setQuantity(event.target.value)}
                          inputMode="numeric"
                          required
                          min={1}
                          max={selected?.availableQuantity ?? 1}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(String(selected?.availableQuantity ?? ""))}
                          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {labels.all}
                        </button>
                      </div>
                    </label>
                  </>
                )}

                {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
                {done ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{labels.done}</p> : null}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {labels.back}
                  </button>
                  <button
                    type="submit"
                    disabled={busy || options.length === 0 || done}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                  >
                    {busy ? "…" : labels.confirm}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
