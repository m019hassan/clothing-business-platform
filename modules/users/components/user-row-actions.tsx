"use client";

import { useActionState } from "react";

import {
  resetUserPasswordAction,
  updateUserAction,
  type UserFormState,
} from "@/modules/users/application/actions";

const initialState: UserFormState = { ok: true, message: "" };

const inputClass =
  "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";

export function UserRowActions({
  accountId,
  firstName,
  lastName,
  email,
  phone,
  status,
  branchId,
}: {
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  branchId: string | null;
}) {
  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email;
  const [updateState, updateAction, isUpdating] = useActionState(updateUserAction, initialState);
  const [passwordState, passwordAction, isResetting] = useActionState(resetUserPasswordAction, initialState);

  return (
    <div className="space-y-2">
      <form action={updateAction} className="grid grid-cols-2 gap-2">
        <input type="hidden" name="accountId" value={accountId} />
        <input
          name="firstName"
          defaultValue={firstName}
          placeholder="First name"
          aria-label={`First name for ${displayName}`}
          className={inputClass}
        />
        <input
          name="lastName"
          defaultValue={lastName}
          placeholder="Last name"
          aria-label={`Last name for ${displayName}`}
          className={inputClass}
        />
        <input
          name="email"
          type="email"
          defaultValue={email}
          placeholder="Email"
          aria-label={`Email for ${displayName}`}
          className={inputClass}
        />
        <input
          name="phone"
          defaultValue={phone}
          placeholder="Phone"
          aria-label={`Phone for ${displayName}`}
          className={inputClass}
        />
        <select name="status" defaultValue={status} aria-label={`Status for ${displayName}`} className={inputClass}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isUpdating}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {isUpdating ? "Saving…" : "Save account"}
          </button>
          {branchId ? <span className="text-xs text-slate-400">branch</span> : null}
        </div>
      </form>

      <form action={passwordAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="accountId" value={accountId} />
        <input
          name="password"
          type="text"
          placeholder="New password"
          aria-label={`New password for ${displayName}`}
          className={`${inputClass} w-40`}
        />
        <button
          type="submit"
          disabled={isResetting}
          className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60"
        >
          {isResetting ? "Resetting…" : "Reset password"}
        </button>
      </form>

      {updateState.message ? (
        <p role={updateState.ok ? "status" : "alert"} className={["text-xs", updateState.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
          {updateState.message}
        </p>
      ) : null}
      {passwordState.message ? (
        <p role={passwordState.ok ? "status" : "alert"} className={["text-xs", passwordState.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
          {passwordState.message}
        </p>
      ) : null}
    </div>
  );
}
