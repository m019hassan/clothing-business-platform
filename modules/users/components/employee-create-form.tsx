"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LookupOption } from "@/modules/employees/application/lookups";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";

export type EmployeeFormLabels = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  passwordHint: string;
  jobTitle: string;
  department: string;
  branch: string;
  noBranch: string;
  roles: string;
  create: string;
  creating: string;
  created: string;
  errors?: ApiErrorLabels;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

/** Creates an employee account through POST /api/users (users.manage). */
export function EmployeeCreateForm({
  departments,
  branches,
  roles,
  labels,
}: {
  departments: LookupOption[];
  branches: LookupOption[];
  roles: LookupOption[];
  labels: EmployeeFormLabels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({
          accountType: "EMPLOYEE",
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          password: formData.get("password"),
          jobTitle: formData.get("jobTitle") || undefined,
          departmentId: formData.get("departmentId") || undefined,
          branchId: formData.get("branchId") || undefined,
          roleIds: selectedRoles,
        }),
      });

      setMessage(labels.created);
      setSelectedRoles([]);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-4 space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.firstName}</span>
          <input name="firstName" required className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.lastName}</span>
          <input name="lastName" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.jobTitle}</span>
          <input name="jobTitle" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.email}</span>
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.phone}</span>
          <input name="phone" required placeholder="+9665..." className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.password}</span>
          <input name="password" type="password" required className={inputClass} />
          <span className="mt-1 block text-xs text-slate-400">{labels.passwordHint}</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.department}</span>
          <select name="departmentId" required className={inputClass}>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.branch}</span>
          <select name="branchId" className={inputClass}>
            <option value="">{labels.noBranch}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.label}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-slate-600">{labels.roles}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
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
              {role.label} <span className="text-xs text-slate-400">({role.code})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? labels.creating : labels.create}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
