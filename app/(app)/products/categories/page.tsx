import Link from "next/link";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listCategories } from "@/modules/catalog/application/categories";
import { CategoryManager } from "@/modules/catalog/components/category-manager";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProductCategoriesPage() {
  await requireAuthenticated();
  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has(PERMISSIONS.PRODUCTS_CREATE);
  const categories = await listCategories({ includeInactive: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.catalog.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.catalog.categories.title}</h1>
      </header>

      {canManage ? (
        <CategoryManager
          categories={categories}
          labels={{ ...t.catalog.categories, saving: t.catalog.form.saving, slugHint: t.catalog.form.slugHint }}
        />
      ) : null}
    </div>
  );
}
