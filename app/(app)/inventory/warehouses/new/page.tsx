import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { WarehouseCreateForm } from "@/modules/branches/components/warehouse-create-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewWarehousePage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t, locale } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const isArabic = locale === "ar";

  if (!permissions.has(PERMISSIONS.BRANCHES_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {isArabic ? "مش عندك صلاحية إدارة المستودعات." : "You do not have permission to manage warehouses."}
        </p>
        <Link
          href="/inventory/warehouses"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.warehouses.title}
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link href="/inventory/warehouses" className="text-sm text-blue-700 hover:underline">
          ← {t.warehouses.title}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.warehouses.add}</h1>
        <p className="text-sm text-slate-600">{t.warehouses.subtitle}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <WarehouseCreateForm
          labels={{
            code: t.warehouses.code,
            codePlaceholder: t.warehouses.codePlaceholder,
            name: t.warehouses.name,
            namePlaceholder: t.warehouses.namePlaceholder,
            add: t.warehouses.add,
          }}
        />
      </section>
    </div>
  );
}
