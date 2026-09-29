"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type Labels = {
  size: string;
  sizePlaceholder: string;
  age: string;
  agePlaceholder: string;
  add: string;
};

export function SizeCreateForm({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [ageLabel, setAgeLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await apiRequest("/api/sizes", { method: "POST", body: JSON.stringify({ label, ageLabel }) });
      setLabel("");
      setAgeLabel("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="w-28 text-sm">
          <span className="mb-1 block font-medium text-slate-700">{labels.size}</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={labels.sizePlaceholder}
            required
            maxLength={20}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">{labels.age}</span>
          <input
            value={ageLabel}
            onChange={(event) => setAgeLabel(event.target.value)}
            placeholder={labels.agePlaceholder}
            required
            maxLength={40}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {labels.add}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
