"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type BranchOption = { id: string; name: string; code: string };

type Labels = {
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  code: string;
  name: string;
  branch: string;
  noBranch: string;
  active: string;
};

export function WarehouseRowActions({
  warehouse,
  branches,
  labels,
}: {
  warehouse: { id: string; code: string; name: string; branchId: string | null; isActive: boolean };
  branches: BranchOption[];
  labels: Labels;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(warehouse.code);
  const [name, setName] = useState(warehouse.name);
  const [branchId, setBranchId] = useState(warehouse.branchId ?? "");
  const [isActive, setIsActive] = useState(warehouse.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/warehouses/${warehouse.id}`, {
        method: "PUT",
        body: JSON.stringify({ code, name, branchId: branchId === "" ? null : branchId, isActive }),
      });
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {labels.edit}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-label={labels.code}
        required
        maxLength={30}
        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs uppercase"
      />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={labels.name}
        required
        minLength={2}
        maxLength={100}
        className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs"
      />
      <select
        value={branchId}
        onChange={(event) => setBranchId(event.target.value)}
        aria-label={labels.branch}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
      >
        <option value="">{labels.noBranch}</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name} ({branch.code})
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        {labels.active}
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? labels.saving : labels.save}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
      >
        {labels.cancel}
      </button>
      {error ? <span className="w-full text-xs text-rose-600">{error}</span> : null}
    </form>
  );
}
