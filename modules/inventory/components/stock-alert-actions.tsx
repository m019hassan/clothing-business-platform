"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

export function StockAlertActions({
  alertId,
  status,
  canResolve,
  labels,
}: {
  alertId: string;
  status: "PENDING" | "NOTIFIED" | "CANCELLED";
  canResolve: boolean;
  labels: {
    notified: string;
    notifiedBusy: string;
    dismiss: string;
    dismissBusy: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"notified" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(next: "NOTIFIED" | "CANCELLED") {
    setBusy(next === "NOTIFIED" ? "notified" : "dismiss");
    setError(null);

    try {
      await apiRequest(`/api/stock-alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(null);
    }
  }

  if (status !== "PENDING" || !canResolve) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => resolve("NOTIFIED")}
          disabled={busy !== null}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {busy === "notified" ? labels.notifiedBusy : labels.notified}
        </button>
        <button
          type="button"
          onClick={() => resolve("CANCELLED")}
          disabled={busy !== null}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          {busy === "dismiss" ? labels.dismissBusy : labels.dismiss}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
