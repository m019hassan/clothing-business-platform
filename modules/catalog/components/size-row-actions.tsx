"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type Labels = {
  remove: string;
  removeConfirm: string;
};

export function SizeRowActions({ sizeId, label, labels }: { sizeId: string; label: string; labels: Labels }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!window.confirm(labels.removeConfirm.replace("{label}", label))) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/sizes/${sizeId}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
      >
        {labels.remove}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
