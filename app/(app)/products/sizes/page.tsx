import Link from "next/link";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { listSizeOptions } from "@/modules/catalog/application/sizes";
import { SizeCreateForm } from "@/modules/catalog/components/size-create-form";
import { SizeRowActions } from "@/modules/catalog/components/size-row-actions";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProductSizesPage() {
  await requireAuthenticated();
  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has(PERMISSIONS.PRODUCTS_CREATE);
  const sizes = await listSizeOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.catalog.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.sizes.title}</h1>
        <p className="text-sm text-slate-600">{t.sizes.subtitle}</p>
      </header>

      {canManage ? <SizeCreateForm labels={t.sizes} /> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3 text-start font-medium">{t.sizes.size}</th>
              <th className="px-6 py-3 text-start font-medium">{t.sizes.age}</th>
              <th className="px-6 py-3 text-start font-medium">{t.sizes.usedBy}</th>
              <th className="px-6 py-3 text-start font-medium">{t.sizes.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sizes.map((size) => (
              <tr key={size.id} className="transition-colors hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900">{size.label}</td>
                <td className="px-6 py-3 text-slate-700">{size.ageLabel}</td>
                <td className="px-6 py-3 text-slate-700">{size.usageCount}</td>
                <td className="px-6 py-3">
                  {canManage ? (
                    <SizeRowActions sizeId={size.id} label={size.label} labels={t.sizes} />
                  ) : null}
                </td>
              </tr>
            ))}
            {sizes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  {t.sizes.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <ul className="divide-y divide-slate-100 md:hidden">
          {sizes.map((size) => (
            <li key={size.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-slate-900">
                <span className="font-semibold">{size.label}</span>
                <span className="ms-2 text-xs text-slate-500">{size.ageLabel}</span>
              </span>
              {canManage ? <SizeRowActions sizeId={size.id} label={size.label} labels={t.sizes} /> : null}
            </li>
          ))}
          {sizes.length === 0 ? <li className="px-4 py-6 text-center text-slate-500">{t.sizes.empty}</li> : null}
        </ul>
      </div>
    </div>
  );
}
