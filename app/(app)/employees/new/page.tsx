import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBranchOptions, listDepartmentOptions, listRoleOptions } from "@/modules/employees/application/lookups";
import { EmployeeCreateForm } from "@/modules/users/components/employee-create-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t, locale } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const isArabic = locale === "ar";

  if (!permissions.has(PERMISSIONS.USERS_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">
          {isArabic ? "مش عندك صلاحية إدارة الموظفين." : "You do not have permission to manage employees."}
        </p>
        <Link
          href="/employees"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.employees.title}
        </Link>
      </section>
    );
  }

  const [departmentOptions, roleOptions, branchOptions] = await Promise.all([
    listDepartmentOptions(),
    listRoleOptions(),
    listBranchOptions(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/employees" className="text-sm text-blue-700 hover:underline">
          ← {t.employees.title}
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{t.employees.createTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.employees.createHint}</p>

        <div className="mt-5">
          <EmployeeCreateForm
            departments={departmentOptions}
            branches={branchOptions}
            roles={roleOptions}
            labels={{ ...t.employees.editor, errors: t.errors }}
          />
        </div>
      </section>
    </div>
  );
}
