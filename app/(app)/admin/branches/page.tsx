import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBranches } from "@/modules/branches/application/branches";
import { listBranchOverviews } from "@/modules/branches/application/branch-details";
import { BranchForm } from "@/modules/branches/components/branch-form";
import { prisma } from "@/src/lib/db";
import { formatDate, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function AdminBranchesPage() {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.BRANCHES_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.branches.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.branches.permissionHint}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  const canManage = permissions.has(PERMISSIONS.BRANCHES_MANAGE);
  const branches = await listBranches(account, { includeInactive: true });
  const overviews = await listBranchOverviews(account);
  const overviewById = new Map(overviews.map((entry) => [entry.branchId, entry]));
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, branchId: true, isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.branches.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.branches.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t.branches.description}
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.adminUsers.title}
        </Link>
      </section>

      {branches.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.branches.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{t.branches.emptyHint}</p>
        </section>
      ) : (
        branches.map((branch) => (
          <section key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                <Link href={`/admin/branches/${branch.id}`} className="hover:text-blue-700 hover:underline">
                  {branch.name}
                </Link>{" "}
                <span className="text-sm font-normal text-slate-500">({branch.code})</span>
                {branch.isActive ? null : (
                  <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t.branches.inactiveBadge}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-xs text-slate-500">
                  {t.branches.warehousesCount
                    .replace("{count}", String(branch.warehouses.length))
                    .replace("{date}", formatDate(branch.createdAt))}
                </p>
                <Link
                  href={`/admin/branches/${branch.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t.branchDetails.details}
                </Link>
              </div>
            </div>

            {(() => {
              const overview = overviewById.get(branch.id);

              if (!overview) {
                return null;
              }

              return (
                <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">{t.branchDetails.salesToday}</p>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(overview.salesToday, "SAR")}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">{t.branchDetails.salesMonth}</p>
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(overview.salesMonth, "SAR")}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">{t.branchDetails.stockAvailable}</p>
                    <p className="text-sm font-semibold text-slate-900">{overview.available}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] text-slate-500">
                      {t.branchDetails.stockLow} / {t.branchDetails.stockOut}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="text-amber-700">{overview.lowCount}</span>
                      {" / "}
                      <span className="text-rose-700">{overview.outCount}</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {canManage ? (
              <div className="mt-5">
                <Link
                  href={`/admin/branches/${branch.id}/edit`}
                  className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t.common.edit}
                </Link>
              </div>
            ) : (
              <ul className="mt-4 text-sm text-slate-600">
                <li>{t.branches.phonePrefix} {branch.phone ?? "—"}</li>
                <li>{t.branches.city}: {branch.city ?? "—"}</li>
                <li>{t.branches.warehouses}: {branch.warehouses.map((warehouse) => warehouse.code).join(", ") || "—"}</li>
              </ul>
            )}
          </section>
        ))
      )}

      {canManage ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{t.branches.newTitle}</h3>
          <div className="mt-5">
            <BranchForm mode="create" warehouses={warehouses} labels={{ ...t.branches, saving: t.branches.saving }} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
