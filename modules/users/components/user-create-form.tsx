"use client";

import { useActionState } from "react";

import { createUserAction, type UserFormState } from "@/modules/users/application/actions";

const initialState: UserFormState = { ok: true, message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

export type UserCreateLabels = {
  accountType: string;
  customer: string;
  employee: string;
  distributor: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phonePlaceholder: string;
  password: string;
  jobTitle: string;
  branch: string;
  noBranch: string;
  create: string;
  creating: string;
  initialPassword: string;
};

export function UserCreateForm({
  branches,
  roles,
  labels,
}: {
  branches: { id: string; name: string; code: string }[];
  roles: { id: string; name: string; code: string }[];
  labels: UserCreateLabels;
}) {
  const [state, formAction, isPending] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="accountType" className={labelClass}>{labels.accountType}</label>
          <select id="accountType" name="accountType" defaultValue="CUSTOMER" className={inputClass}>
            <option value="CUSTOMER">{labels.customer}</option>
            <option value="EMPLOYEE">{labels.employee}</option>
            <option value="DISTRIBUTOR">{labels.distributor}</option>
          </select>
        </div>
        <div>
          <label htmlFor="firstName" className={labelClass}>{labels.firstName}</label>
          <input id="firstName" name="firstName" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>{labels.lastName}</label>
          <input id="lastName" name="lastName" className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>{labels.email}</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>{labels.phone}</label>
          <input id="phone" name="phone" required placeholder={labels.phonePlaceholder} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            {labels.initialPassword}
          </label>
          <input id="password" name="password" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="jobTitle" className={labelClass}>
            Job title (employees)
          </label>
          <input id="jobTitle" name="jobTitle" className={inputClass} />
        </div>
        <div>
          <label htmlFor="branchId" className={labelClass}>
            Branch (employees and distributors — required for distributors)
          </label>
          <select id="branchId" name="branchId" defaultValue="" className={inputClass}>
            <option value="">{labels.noBranch}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {roles.length > 0 ? (
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Roles (employees)
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="roleIds" value={role.id} className="h-4 w-4 rounded border-slate-300" />
                {role.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? labels.creating : labels.create}
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
