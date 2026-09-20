import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getAccessOverview } from "@/modules/employees/application/employees";
import type { AccessOverviewView } from "@/modules/employees/types";

export default async function RolesPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.ROLES_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Role access requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the roles.view permission. Ask a manager to grant it.
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  let overview: AccessOverviewView | null = null;
  let loadError = false;

  try {
    overview = await getAccessOverview();
  } catch {
    loadError = true;
  }

  if (loadError || overview === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load roles</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
      </section>
    );
  }

  const { roles, catalog } = overview;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Roles &amp; permissions</h2>
          <p className="mt-1 text-sm text-slate-600">
            {roles.length} role{roles.length === 1 ? "" : "s"} · {catalog.reduce((sum, entry) => sum + entry.permissions.length, 0)} active permissions
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Role management endpoints do not exist yet"
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
        >
          Create role
        </button>
      </section>

      {roles.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No roles defined yet</p>
        </section>
      ) : (
        <>
          {/* Desktop matrix */}
          <section className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="sticky left-0 bg-slate-50 px-6 py-3">Permission</th>
                  {roles.map((role) => (
                    <th key={role.id} scope="col" className="px-4 py-3 text-center">
                      {role.name}
                      <span className="mt-1 block text-[10px] font-normal normal-case text-slate-400">
                        {role.employeeCount} employee{role.employeeCount === 1 ? "" : "s"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog.map((entry) => (
                  <Fragment key={entry.module}>
                    <tr className="bg-slate-50/60">
                      <td colSpan={roles.length + 1} className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {entry.module}
                      </td>
                    </tr>
                    {entry.permissions.map((permission) => (
                      <tr key={permission.code} className="transition-colors hover:bg-slate-50">
                        <td className="sticky left-0 bg-white px-6 py-3">
                          <p className="font-medium text-slate-800">{permission.name}</p>
                          <p className="text-xs text-slate-500">{permission.code}</p>
                        </td>
                        {roles.map((role) => (
                          <td key={`${role.id}-${permission.code}`} className="px-4 py-3 text-center">
                            {role.permissionCodes.includes(permission.code) ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mobile: one card per role */}
          <section className="space-y-3 lg:hidden">
            {roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{role.name}</p>
                    <p className="truncate text-xs text-slate-500">{role.code}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${role.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    {role.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {role.employeeCount} employee{role.employeeCount === 1 ? "" : "s"} · {role.permissionCodes.length} permission{role.permissionCodes.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {role.permissionCodes.length > 0 ? (
                    role.permissionCodes.map((code) => <li key={code}>{code}</li>)
                  ) : (
                    <li className="text-slate-400">No permissions</li>
                  )}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Read-only administration</h3>
        <p className="mt-1 text-sm text-slate-500">
          Creating roles, editing role permissions and assigning roles to employees have no backend endpoints yet.
          Direct employee permissions are not part of the current model.
        </p>
      </section>
    </div>
  );
}
