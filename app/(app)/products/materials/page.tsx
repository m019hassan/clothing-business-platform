import Link from "next/link";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { listMaterialOptions } from "@/modules/catalog/application/materials";
import { MaterialCreateForm } from "@/modules/catalog/components/material-create-form";
import { MaterialRowActions } from "@/modules/catalog/components/material-row-actions";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProductMaterialsPage() {
  await requireAuthenticated();
  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has(PERMISSIONS.PRODUCTS_CREATE);
  const materials = await listMaterialOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.catalog.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.materials.title}</h1>
        <p className="text-sm text-slate-600">{t.materials.subtitle}</p>
      </header>

      {canManage ? <MaterialCreateForm labels={t.materials} /> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 text-start font-medium">{t.materials.name}</th>
              <th className="px-6 py-3 text-start font-medium">{t.materials.usedBy}</th>
              <th className="px-6 py-3 text-start font-medium">{t.materials.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.map((material) => (
              <tr key={material.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900">{material.name}</td>
                <td className="px-6 py-3 text-slate-700">{material.usageCount}</td>
                <td className="px-6 py-3">
                  {canManage ? (
                    <MaterialRowActions materialId={material.id} name={material.name} labels={t.materials} />
                  ) : null}
                </td>
              </tr>
            ))}
            {materials.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  {t.materials.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <ul className="divide-y divide-slate-100 md:hidden">
          {materials.map((material) => (
            <li key={material.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-medium text-slate-900">
                {material.name}
                <span className="ms-2 text-xs font-normal text-slate-500">({material.usageCount})</span>
              </span>
              {canManage ? (
                <MaterialRowActions materialId={material.id} name={material.name} labels={t.materials} />
              ) : null}
            </li>
          ))}
          {materials.length === 0 ? (
            <li className="px-4 py-6 text-center text-slate-500">{t.materials.empty}</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
