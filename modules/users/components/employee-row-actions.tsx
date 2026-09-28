"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LookupOption } from "@/modules/employees/application/lookups";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";

export type EmployeeRowLabels = {
  edit: string;
  close: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  status: string;
  roles: string;
  save: string;
  saving: string;
  saved: string;
  remove: string;
  removeConfirm: string;
  archived: string;
  deleted: string;
  errors?: ApiErrorLabels;
  statusLabels: Record<string, string>;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

/** Edits one employee, or removes the account (deleteUser decides archive vs delete). */
export function EmployeeRowActions({
  employee,
  departments,
  roles,
  labels,
}: {
  employee: {
    accountId: string;
    firstName: string;
    lastName: string | null;
    jobTitle: string | null;
    accountStatus: string;
    departmentName: string | null;
    roleIds: string[];
  };
  departments: LookupOption[];
  roles: LookupOption[];
  labels: EmployeeRowLabels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<null | "save" | "remove">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName ?? "");
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? "");
  const [status, setStatus] = useState(employee.accountStatus);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(employee.roleIds);

  async function save() {
    setPending("save");
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/users/${employee.accountId}`, {
        method: "PUT",
        body: JSON.stringify({ firstName, lastName, jobTitle, status, roleIds: selectedRoles }),
      });

      setMessage(labels.saved);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!window.confirm(labels.removeConfirm)) {
      return;
    }

    setPending("remove");
    setError(null);
    setMessage(null);

    try {
      const result = await apiRequest<{ mode: "archived" | "deleted" }>(`/api/users/${employee.accountId}`, {
        method: "DELETE",
      });

      setMessage(result.mode === "archived" ? labels.archived : labels.deleted);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {labels.edit}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-start">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.firstName}</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.lastName}</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.jobTitle}</span>
          <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.status}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="ACTIVE">{labels.statusLabels.ACTIVE}</option>
            <option value="SUSPENDED">{labels.statusLabels.SUSPENDED}</option>
            <option value="ARCHIVED">{labels.statusLabels.ARCHIVED}</option>
          </select>
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-slate-600">{labels.roles}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={(event) =>
                  setSelectedRoles((current) =>
                    event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id),
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending !== null}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "save" ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending !== null}
          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {pending === "remove" ? labels.saving : labels.remove}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          {labels.close}
        </button>
        {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
