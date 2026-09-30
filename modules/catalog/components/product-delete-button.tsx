"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

export function ProductDeleteButton({
  productId,
  productName,
  labels,
}: {
  productId: string;
  productName: string;
  labels: { deleteProduct: string; deleteConfirm: string; deleting: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!window.confirm(labels.deleteConfirm.replace("{name}", productName))) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/products/${productId}`, { method: "DELETE" });
      router.push("/products");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
      >
        {busy ? labels.deleting : labels.deleteProduct}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
