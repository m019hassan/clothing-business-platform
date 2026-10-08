"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";
import type { PosHistoryRow } from "@/modules/pos/application/pos-returns";

type Labels = {
  return: string;
  returnDone: string;
  sellReplacement: string;
  returnTitle: string;
  quantity: string;
  confirmReturn: string;
  voidSale: string;
  voidConfirm: string;
  cancel: string;
  exchangeHint: string;
};

/** Per-line return quantities plus a one-click void, both behind a confirmation. */
export function PosReturnPanel({ sale, labels }: { sale: PosHistoryRow; labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastReturn, setLastReturn] = useState<{ units: number; amount: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const setQuantity = (orderItemId: string, value: string) =>
    setQuantities((current) => ({ ...current, [orderItemId]: value }));

  const submitReturn = async () => {
    const lines = sale.lines
      .map((line) => ({ orderItemId: line.orderItemId, quantity: Number(quantities[line.orderItemId] ?? 0) }))
      .filter((line) => line.quantity > 0);

    if (lines.length === 0) {
      setError(labels.quantity);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await apiRequest<{
        result: { returnedUnits: number; refundedAmount: string };
      }>(`/api/pos/sales/${sale.orderId}/return`, {
        method: "POST",
        body: JSON.stringify({ lines }),
      });
      setOpen(false);
      setQuantities({});
      setLastReturn({ units: result.result.returnedUnits, amount: result.result.refundedAmount });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const submitVoid = async () => {
    if (!window.confirm(labels.voidConfirm)) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/pos/sales/${sale.orderId}/void`, { method: "POST" });
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          {labels.return}
        </button>
        {lastReturn ? (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">
            {labels.returnDone
              .replace("{units}", String(lastReturn.units))
              .replace("{amount}", lastReturn.amount)}
            <button
              type="button"
              onClick={() => router.push("/pos")}
              className="rounded-md bg-emerald-700 px-2 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {labels.sellReplacement}
            </button>
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labels.returnTitle}</p>

      <ul className="space-y-2">
        {sale.lines
          .filter((line) => line.quantity > line.returnedQuantity)
          .map((line) => {
            const remaining = line.quantity - line.returnedQuantity;

            return (
              <li key={line.orderItemId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {line.productName} <span className="font-mono text-xs text-slate-400">{line.sku}</span>
                </span>
                <label className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{labels.quantity}</span>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    value={quantities[line.orderItemId] ?? ""}
                    onChange={(event) => setQuantity(line.orderItemId, event.target.value)}
                    placeholder={`0 / ${remaining}`}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
              </li>
            );
          })}
      </ul>

      <p className="text-xs text-slate-500">{labels.exchangeHint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submitReturn}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
        >
          {labels.confirmReturn}
        </button>
        <button
          type="button"
          onClick={submitVoid}
          disabled={busy}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {labels.voidSale}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuantities({});
            setError(null);
          }}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white"
        >
          {labels.cancel}
        </button>
        {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
