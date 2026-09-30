"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TransferTarget } from "@/modules/inventory/application/transfers";
import { apiRequest } from "@/src/lib/api";

type Labels = {
  transfer: string;
  toBranch: string;
  quantity: string;
  confirmTransfer: string;
  cancel: string;
};

/** A small dialog that moves units from one warehouse to another branch. */
export function StockTransferForm({
  variantId,
  fromWarehouseId,
  sku,
  targets,
  labels,
}: {
  variantId: string;
  fromWarehouseId: string;
  sku: string;
  targets: TransferTarget[];
  labels: Labels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toBranchId, setToBranchId] = useState(targets[0]?.branchId ?? "");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiRequest("/api/inventory/transfer", {
        method: "POST",
        body: JSON.stringify({ variantId, fromWarehouseId, toBranchId, quantity: Number(quantity) }),
      });
      setOpen(false);
      setQuantity("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {labels.transfer}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="truncate font-mono text-[11px] text-slate-400">{sku}</p>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">{labels.toBranch}</span>
        <select
          value={toBranchId}
          onChange={(event) => setToBranchId(event.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          {targets.map((target) => (
            <option key={target.branchId} value={target.branchId}>
              {target.branchName} ({target.branchCode})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-slate-600">{labels.quantity}</span>
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          inputMode="numeric"
          required
          min={1}
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {labels.confirmTransfer}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          {labels.cancel}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </form>
  );
}
