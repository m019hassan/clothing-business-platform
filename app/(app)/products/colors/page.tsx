import Link from "next/link";

import { ColorCreateForm } from "@/modules/catalog/components/color-create-form";
import { ColorRowActions } from "@/modules/catalog/components/color-row-actions";
import { listColorOptions } from "@/modules/catalog/application/colors";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProductColorsPage() {
  await requireAuthenticated();
  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has(PERMISSIONS.PRODUCTS_CREATE);
  const colors = await listColorOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.catalog.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.colors.title}</h1>
        <p className="text-sm text-slate-600">{t.colors.subtitle}</p>
      </header>

      {canManage ? <ColorCreateForm labels={t.colors} /> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-slate-50 text-start text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 text-start font-medium">{t.colors.name}</th>
              <th className="px-6 py-3 text-start font-medium">{t.colors.code}</th>
              <th className="px-6 py-3 text-start font-medium">{t.colors.usedBy}</th>
              <th className="px-6 py-3 text-start font-medium">{t.colors.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {colors.map((color) => (
              <tr key={color.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-3">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name}
                    {color.nameEn ? (
                      <span className="text-xs font-normal text-slate-400">{color.nameEn}</span>
                    ) : null}
                  </span>
                </td>
                <td className="px-6 py-3 font-mono text-xs text-slate-500">{color.hex}</td>
                <td className="px-6 py-3 text-slate-700">{color.usageCount}</td>
                <td className="px-6 py-3">
                  {canManage ? (
                    <ColorRowActions
                      colorId={color.id}
                      name={color.name}
                      nameEn={color.nameEn}
                      hex={color.hex}
                      labels={t.colors}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
            {colors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  {t.colors.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <ul className="divide-y divide-slate-100 md:hidden">
          {colors.map((color) => (
            <li key={color.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name}
                <span className="text-xs font-normal text-slate-500">({color.usageCount})</span>
              </span>
              {canManage ? (
                <ColorRowActions
                  colorId={color.id}
                  name={color.name}
                  nameEn={color.nameEn}
                  hex={color.hex}
                  labels={t.colors}
                />
              ) : null}
            </li>
          ))}
          {colors.length === 0 ? <li className="px-4 py-6 text-center text-slate-500">{t.colors.empty}</li> : null}
        </ul>
      </div>
    </div>
  );
}
