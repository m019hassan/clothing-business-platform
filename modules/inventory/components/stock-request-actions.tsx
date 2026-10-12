"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type WarehouseOption = { id: string; name: string; code: string };

export function StockRequestActions({
  requestId,
  status,
  canCancel,
  canFulfill,
  warehouses,
  labels,
}: {
  requestId: string;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  canCancel: boolean;
  canFulfill: boolean;
  warehouses: WarehouseOption[];
  labels: {
    cancel: string;
    cancelling: string;
    fulfill: string;
    fulfilling: string;
    pick: string;
    confirm: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/stock-requests/${requestId}`, { method: "PATCH" });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  async function fulfill() {
    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/stock-requests/${requestId}/fulfill`, {
        method: "POST",
        body: JSON.stringify({ fromWarehouseId: warehouseId }),
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canCancel ? (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {busy ? labels.cancelling : labels.cancel}
          </button>
        ) : null}
        {canFulfill ? (
          <button
            type="button"
            onClick={() => setPicking((value) => !value)}
            disabled={busy || warehouses.length === 0}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? labels.fulfilling : labels.fulfill}
          </button>
        ) : null}
      </div>

      {picking && canFulfill ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <select
            value={warehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
            aria-label={labels.pick}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} ({warehouse.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fulfill}
            disabled={busy || !warehouseId}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {labels.confirm}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
