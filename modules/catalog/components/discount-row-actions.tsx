"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DiscountRowActions({
  promotionId,
  isActive,
  labels,
}: {
  promotionId: string;
  isActive: boolean;
  labels: { stop: string; start: string; delete: string; deleteConfirm: string; deleting: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);

    try {
      await fetch(`/api/promotions/${promotionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(labels.deleteConfirm)) {
      return;
    }

    setBusy(true);

    try {
      await fetch(`/api/promotions/${promotionId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleActive}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {isActive ? labels.stop : labels.start}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
      >
        {busy ? labels.deleting : labels.delete}
      </button>
    </div>
  );
}
