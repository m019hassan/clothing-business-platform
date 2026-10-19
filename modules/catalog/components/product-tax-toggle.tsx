"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, type ApiErrorLabels } from "@/src/lib/api";

export function ProductTaxToggle({
  productId,
  initialExempt,
  labels,
  errors,
}: {
  productId: string;
  initialExempt: boolean;
  labels: { exempt: string; taxable: string; saving: string };
  errors?: ApiErrorLabels;
}) {
  const router = useRouter();
  const [exempt, setExempt] = useState(initialExempt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/tax-exempt`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taxExempt: !exempt }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      }

      setExempt((current) => !current);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? apiErrorMessage(cause, errors) : String(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={[
          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60",
          exempt
            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
            : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        ].join(" ")}
      >
        {pending ? labels.saving : exempt ? labels.exempt : labels.taxable}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
