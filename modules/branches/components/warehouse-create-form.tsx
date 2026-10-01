"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type BranchOption = { id: string; name: string; code: string };

type Labels = {
  code: string;
  codePlaceholder: string;
  name: string;
  namePlaceholder: string;
  branch: string;
  noBranch: string;
  add: string;
};

export function WarehouseCreateForm({ branches, labels }: { branches: BranchOption[]; labels: Labels }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await apiRequest("/api/warehouses", {
        method: "POST",
        body: JSON.stringify({ code, name, branchId: branchId === "" ? null : branchId }),
      });
      setCode("");
      setName("");
      setBranchId("");
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
        <label className="w-36 text-sm">
          <span className="mb-1 block font-medium text-slate-700">{labels.code}</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={labels.codePlaceholder}
            required
            maxLength={30}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">{labels.name}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={labels.namePlaceholder}
            required
            minLength={2}
            maxLength={100}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="min-w-[180px] flex-1 text-sm">
          <span className="mb-1 block font-medium text-slate-700">{labels.branch}</span>
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none"
          >
            <option value="">{labels.noBranch}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.code})
              </option>
            ))}
          </select>
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
