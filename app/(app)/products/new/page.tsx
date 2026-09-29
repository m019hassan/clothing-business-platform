import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCategories } from "@/modules/catalog/application/categories";
import { listColorOptions } from "@/modules/catalog/application/colors";
import { ProductForm } from "@/modules/catalog/components/product-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function NewProductPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const { t } = await getInterfaceLanguage();

  if (!permissions.has(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.catalog.newPage.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.catalog.newPage.permissionHint}
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.products}
        </Link>
      </section>
    );
  }

  const categories = await listCategories({ includeInactive: true });
  const colors = await listColorOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.catalog.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.catalog.newPage.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {t.catalog.newPage.subtitle}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProductForm
          mode="create"
          categories={categories}
          colors={colors}
          labels={{ ...t.catalog.form, status: t.common.status, category: t.catalog.category }}
          statusLabels={t.catalog.statusLabels}
        />
      </section>
    </div>
  );
}
