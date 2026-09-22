"use client";

import { useActionState } from "react";

import {
  updateRolePermissionsAction,
  type RoleFormState,
} from "@/modules/employees/application/actions";
import type { PermissionCatalogEntry, RoleWithPermissionsView } from "@/modules/employees/types";

const initialState: RoleFormState = { ok: true, message: "" };

export function RolePermissionsEditor({
  role,
  catalog,
}: {
  role: RoleWithPermissionsView;
  catalog: PermissionCatalogEntry[];
}) {
  const [state, formAction, isPending] = useActionState(updateRolePermissionsAction, initialState);
  const granted = new Set(role.permissionCodes);

  if (role.isSystem) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        {role.name} is a system role maintained by the platform (npm run make-admin) and cannot be edited here.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="roleId" value={role.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((group) => (
          <fieldset key={group.module} className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.module}
            </legend>
            <div className="space-y-1.5">
              {group.permissions.map((permission) => (
                <label key={permission.code} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="permissionCodes"
                    value={permission.code}
                    defaultChecked={granted.has(permission.code)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {permission.code}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save permissions"}
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
