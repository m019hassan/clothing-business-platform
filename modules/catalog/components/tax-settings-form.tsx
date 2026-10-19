"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TaxSettingsLabels = {
  enabled: string;
  disabled: string;
  rateLabel: string;
  inclusive: string;
  exclusive: string;
  save: string;
  saving: string;
  saved: string;
  invalidRate: string;
};

export function TaxSettingsForm({
  initial,
  labels,
}: {
  initial: { enabled: boolean; ratePercent: string; inclusive: boolean };
  labels: TaxSettingsLabels;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [rate, setRate] = useState(initial.ratePercent);
  const [inclusive, setInclusive] = useState(initial.inclusive);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = Number(rate);

    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError(labels.invalidRate);
      return;
    }

    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/products/tax", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, ratePercent: value, inclusive }),
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
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{labels.enabled}</p>
          <p className="text-xs text-slate-500">{enabled ? labels.enabled : labels.disabled}</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((current) => !current)}
          aria-pressed={enabled}
          className={[
            "relative h-8 w-16 rounded-full transition-colors",
            enabled ? "bg-emerald-600" : "bg-slate-300",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
              enabled ? "start-9" : "start-1",
            ].join(" ")}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tax-rate" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            {labels.rateLabel}
          </label>
          <input
            id="tax-rate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={rate}
            onChange={(event) => {
              setRate(event.target.value);
              setSaved(false);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            {inclusive ? labels.inclusive : labels.exclusive}
          </p>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInclusive(true)}
              aria-pressed={inclusive}
              className={[
                "flex-1 rounded-md px-3 py-1.5 transition-colors",
                inclusive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              ].join(" ")}
            >
              {labels.inclusive}
            </button>
            <button
              type="button"
              onClick={() => setInclusive(false)}
              aria-pressed={!inclusive}
              className={[
                "flex-1 rounded-md px-3 py-1.5 transition-colors",
                !inclusive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              ].join(" ")}
            >
              {labels.exclusive}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? labels.saving : labels.save}
        </button>
        {saved ? <span className="text-sm font-semibold text-emerald-700">{labels.saved}</span> : null}
        {error ? <span className="text-sm text-rose-700">{error}</span> : null}
      </div>
    </div>
  );
}
