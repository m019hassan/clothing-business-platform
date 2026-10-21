import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { RoleCreateForm } from "@/modules/employees/components/role-create-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewRolePage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t, locale } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const isArabic = locale === "ar";

  if (!permissions.has(PERMISSIONS.ROLES_CREATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {isArabic ? "مش عندك صلاحية إضافة أدوار." : "You do not have permission to add roles."}
        </p>
        <Link
          href="/roles"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.roles.title}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/roles" className="text-sm text-blue-700 hover:underline">
          ← {t.roles.title}
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{t.roles.createTitle}</h2>

        <div className="mt-5">
          <RoleCreateForm labels={t.roles.create} />
        </div>
      </section>
    </div>
  );
}
