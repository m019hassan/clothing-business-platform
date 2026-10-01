import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listWarehouses } from "@/modules/branches/application/warehouses";
import { WarehouseCreateForm } from "@/modules/branches/components/warehouse-create-form";
import { WarehouseRowActions } from "@/modules/branches/components/warehouse-row-actions";
import { prisma } from "@/src/lib/db";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminWarehousesPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.BRANCHES_VIEW)) {
    redirect("/dashboard");
  }

  const canManage = permissions.has(PERMISSIONS.BRANCHES_MANAGE);
  const { t } = await getInterfaceLanguage();
  const warehouses = await listWarehouses();
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/admin/branches" className="text-sm text-blue-700 hover:underline">
          ← {t.branches.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.warehouses.title}</h1>
        <p className="text-sm text-slate-600">{t.warehouses.subtitle}</p>
      </header>

      {canManage ? (
        <WarehouseCreateForm
          branches={branches}
          labels={{
            code: t.warehouses.code,
            codePlaceholder: t.warehouses.codePlaceholder,
            name: t.warehouses.name,
            namePlaceholder: t.warehouses.namePlaceholder,
            branch: t.warehouses.branch,
            noBranch: t.warehouses.noBranch,
            add: t.warehouses.add,
          }}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 text-start font-medium">{t.warehouses.name}</th>
              <th className="px-6 py-3 text-start font-medium">{t.warehouses.branch}</th>
              <th className="px-6 py-3 text-end font-medium">{t.branchDetails.stockOnHand}</th>
              <th className="px-6 py-3 text-end font-medium">{t.branchDetails.stockAvailable}</th>
              <th className="px-6 py-3 text-start font-medium">{t.common.status}</th>
              <th className="px-6 py-3 text-start font-medium">{t.warehouses.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{warehouse.name}</p>
                  <p className="font-mono text-xs text-slate-400">{warehouse.code}</p>
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {warehouse.branchName ?? t.warehouses.central}
                  <span className="ms-1 text-xs text-slate-400">({warehouse.trackedItems})</span>
                </td>
                <td className="px-6 py-3 text-end text-slate-700">{warehouse.onHand}</td>
                <td className="px-6 py-3 text-end font-medium text-slate-900">{warehouse.available}</td>
                <td className="px-6 py-3">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      warehouse.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {warehouse.isActive ? t.branchDetails.active : t.branchDetails.inactive}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {canManage ? (
                    <WarehouseRowActions
                      warehouse={{
                        id: warehouse.id,
                        code: warehouse.code,
                        name: warehouse.name,
                        branchId: warehouse.branchId,
                        isActive: warehouse.isActive,
                      }}
                      branches={branches}
                      labels={{
                        edit: t.warehouses.edit,
                        save: t.warehouses.save,
                        saving: t.warehouses.saving,
                        cancel: t.warehouses.cancel,
                        code: t.warehouses.code,
                        name: t.warehouses.name,
                        branch: t.warehouses.branch,
                        noBranch: t.warehouses.noBranch,
                        active: t.branchDetails.active,
                      }}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  {t.warehouses.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <ul className="divide-y divide-slate-100 md:hidden">
          {warehouses.map((warehouse) => (
            <li key={warehouse.id} className="space-y-2 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{warehouse.name}</p>
                  <p className="font-mono text-xs text-slate-400">{warehouse.code}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {t.branchDetails.stockAvailable}: <span className="font-semibold text-slate-800">{warehouse.available}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">{warehouse.branchName ?? t.warehouses.central}</p>
              {canManage ? (
                <WarehouseRowActions
                  warehouse={{
                    id: warehouse.id,
                    code: warehouse.code,
                    name: warehouse.name,
                    branchId: warehouse.branchId,
                    isActive: warehouse.isActive,
                  }}
                  branches={branches}
                  labels={{
                    edit: t.warehouses.edit,
                    save: t.warehouses.save,
                    saving: t.warehouses.saving,
                    cancel: t.warehouses.cancel,
                    code: t.warehouses.code,
                    name: t.warehouses.name,
                    branch: t.warehouses.branch,
                    noBranch: t.warehouses.noBranch,
                    active: t.branchDetails.active,
                  }}
                />
              ) : null}
            </li>
          ))}
          {warehouses.length === 0 ? (
            <li className="px-4 py-6 text-center text-slate-500">{t.warehouses.empty}</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
