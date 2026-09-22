import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBranches } from "@/modules/branches/application/branches";
import { BranchForm } from "@/modules/branches/components/branch-form";
import { prisma } from "@/src/lib/db";
import { formatDate } from "@/src/lib/format";

export default async function AdminBranchesPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.BRANCHES_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Branch management requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the branches.view permission. Ask a manager to grant it.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  const canManage = permissions.has(PERMISSIONS.BRANCHES_MANAGE);
  const branches = await listBranches(account, { includeInactive: true });
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, branchId: true, isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Branches</h2>
          <p className="mt-1 text-sm text-slate-600">
            A branch owns one or more warehouses. Today the factory serves the branches; give a branch its own
            warehouse when its stock must be tracked separately.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Accounts
        </Link>
      </section>

      {branches.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No branches yet</p>
          <p className="mt-1 text-sm text-slate-500">Create the first branch below.</p>
        </section>
      ) : (
        branches.map((branch) => (
          <section key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {branch.name}{" "}
                <span className="text-sm font-normal text-slate-500">({branch.code})</span>
                {branch.isActive ? null : (
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    inactive
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {branch.warehouses.length} warehouse(s) · created {formatDate(branch.createdAt)}
              </p>
            </div>

            {canManage ? (
              <div className="mt-5">
                <BranchForm mode="edit" branch={branch} warehouses={warehouses} />
              </div>
            ) : (
              <ul className="mt-4 text-sm text-slate-600">
                <li>Phone: {branch.phone ?? "—"}</li>
                <li>City: {branch.city ?? "—"}</li>
                <li>Warehouses: {branch.warehouses.map((warehouse) => warehouse.code).join(", ") || "—"}</li>
              </ul>
            )}
          </section>
        ))
      )}

      {canManage ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">New branch</h3>
          <div className="mt-5">
            <BranchForm mode="create" warehouses={warehouses} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
