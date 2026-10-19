"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CashierDiscountForm({
  cashierId,
  initial,
  labels,
}: {
  cashierId: string;
  initial: { canDiscount: boolean; code: string; percent: string };
  labels: { canDiscount: string; code: string; percent: string; save: string; saving: string; saved: string };
}) {
  const router = useRouter();
  const [canDiscount, setCanDiscount] = useState(initial.canDiscount);
  const [code, setCode] = useState(initial.code);
  const [percent, setPercent] = useState(initial.percent);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch(`/api/admin/cashiers/${cashierId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          canDiscount,
          discountCode: code.trim() === "" ? null : code.trim(),
          discountPercent: percent.trim() === "" ? null : Number(percent),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      }

      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <input
          type="checkbox"
          checked={canDiscount}
          onChange={(event) => {
            setCanDiscount(event.target.checked);
            setSaved(false);
          }}
          className="h-4 w-4 rounded border-slate-300"
        />
        {labels.canDiscount}
      </label>
      <input
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setSaved(false);
        }}
        placeholder={labels.code}
        dir="ltr"
        className="w-32 rounded-lg border border-slate-300 px-2 py-1 text-xs uppercase outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number"
        min={0}
        max={100}
        step="0.01"
        value={percent}
        onChange={(event) => {
          setPercent(event.target.value);
          setSaved(false);
        }}
        placeholder={labels.percent}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? labels.saving : labels.save}
      </button>
      {saved ? <span className="text-xs font-semibold text-emerald-700">{labels.saved}</span> : null}
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
