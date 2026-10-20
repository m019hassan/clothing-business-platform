"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarketingConsentToggle({
  customerId,
  initial,
  labels,
}: {
  customerId: string;
  initial: boolean;
  labels: { granted: string; notGranted: string; saving: string };
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/marketing-consent`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketingConsent: !value }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      }

      setValue((current) => !current);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={value}
        className={[
          "relative h-6 w-11 rounded-full transition-colors disabled:opacity-60",
          value ? "bg-emerald-600" : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            value ? "start-5" : "start-0.5",
          ].join(" ")}
        />
      </button>
      <span className={["text-xs font-semibold", value ? "text-emerald-700" : "text-slate-500"].join(" ")}>
        {pending ? labels.saving : value ? labels.granted : labels.notGranted}
      </span>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
