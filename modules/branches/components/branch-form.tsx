"use client";

import { useActionState } from "react";

import {
  createBranchAction,
  updateBranchAction,
  type BranchFormState,
} from "@/modules/branches/application/actions";
import type { BranchView } from "@/modules/branches/types";

const initialState: BranchFormState = { ok: true, message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

export type BranchFormLabels = {
  code: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  active: string;
  warehouseList: string;
  warehousesOfBranch: string;
  noWarehouses: string;
  codePlaceholder: string;
  create: string;
  save: string;
  saving: string;
};

export function BranchForm({
  mode,
  branch,
  warehouses,
  labels,
}: {
  mode: "create" | "edit";
  branch?: BranchView;
  warehouses: { id: string; code: string; name: string; branchId: string | null }[];
  labels: BranchFormLabels;
}) {
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createBranchAction : updateBranchAction,
    initialState,
  );

  const key = branch?.id ?? "new";
  const assigned = new Set(branch?.warehouses.map((warehouse) => warehouse.id) ?? []);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && branch ? <input type="hidden" name="branchId" value={branch.id} /> : null}
      {/* Tells the action that the active checkbox belongs to this submission. */}
      <input type="hidden" name="isActiveProvided" value="1" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`code-${key}`} className={labelClass}>
            {labels.code}
          </label>
          <input id={`code-${key}`} name="code" defaultValue={branch?.code ?? ""} placeholder={labels.codePlaceholder} required className={inputClass} />
        </div>
        <div>
          <label htmlFor={`name-${key}`} className={labelClass}>
            {labels.name}
          </label>
          <input id={`name-${key}`} name="name" defaultValue={branch?.name ?? ""} required className={inputClass} />
        </div>
        <div>
          <label htmlFor={`phone-${key}`} className={labelClass}>
            {labels.phone}
          </label>
          <input id={`phone-${key}`} name="phone" defaultValue={branch?.phone ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor={`city-${key}`} className={labelClass}>
            {labels.city}
          </label>
          <input id={`city-${key}`} name="city" defaultValue={branch?.city ?? ""} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`address-${key}`} className={labelClass}>
            {labels.address}
          </label>
          <input id={`address-${key}`} name="address" defaultValue={branch?.address ?? ""} className={inputClass} />
        </div>
      </div>

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {labels.warehousesOfBranch}
        </legend>
        {warehouses.length === 0 ? (
          <p className="text-sm text-slate-500">{labels.noWarehouses}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {warehouses.map((warehouse) => (
              <label key={warehouse.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="warehouseIds"
                  value={warehouse.id}
                  defaultChecked={assigned.has(warehouse.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {warehouse.name} ({warehouse.code})
                {warehouse.branchId && !assigned.has(warehouse.id) ? (
                  <span className="text-xs text-slate-400">in another branch</span>
                ) : null}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex items-center gap-3">
        <input
          id={`isActive-${key}`}
          name="isActive"
          type="checkbox"
          defaultChecked={branch ? branch.isActive : true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor={`isActive-${key}`} className="text-sm text-slate-700">
            {labels.active}
          </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? labels.saving : mode === "create" ? labels.create : labels.save}
        </button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
