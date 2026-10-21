import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { MaterialCreateForm } from "@/modules/catalog/components/material-create-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewMaterialPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t, locale } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const isArabic = locale === "ar";

  if (!permissions.has(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {isArabic ? "مش عندك صلاحية الإضافة." : "You do not have permission to add this."}
        </p>
        <Link
          href="/products/materials"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.materials.title}
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/products/materials" className="text-sm text-blue-700 hover:underline">
          ← {t.materials.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.materials.add}</h1>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <MaterialCreateForm labels={t.materials} />
      </section>
    </div>
  );
}
