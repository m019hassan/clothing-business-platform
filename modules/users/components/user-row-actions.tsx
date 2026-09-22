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
  displayName,
  status,
  branchId,
}: {
  accountId: string;
  displayName: string;
  status: string;
  branchId: string | null;
}) {
  const [updateState, updateAction, isUpdating] = useActionState(updateUserAction, initialState);
  const [passwordState, passwordAction, isResetting] = useActionState(resetUserPasswordAction, initialState);

  return (
    <div className="space-y-2">
      <form action={updateAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="accountId" value={accountId} />
        <input type="hidden" name="firstName" value={displayName.split(" ")[0] ?? ""} />
        <select name="status" defaultValue={status} aria-label={`Status for ${displayName}`} className={inputClass}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <button
          type="submit"
          disabled={isUpdating}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isUpdating ? "Saving…" : "Update status"}
        </button>
        {branchId ? <span className="text-xs text-slate-400">branch assigned</span> : null}
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
