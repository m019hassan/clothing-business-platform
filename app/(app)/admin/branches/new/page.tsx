import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { BranchForm } from "@/modules/branches/components/branch-form";
import { prisma } from "@/src/lib/db";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.BRANCHES_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.branches.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{t.branches.permissionHint}</p>
        <Link
          href="/admin/branches"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.branches.title}
        </Link>
      </section>
    );
  }

  const warehouses = await prisma.warehouse
    .findMany({
      select: { id: true, code: true, name: true, branchId: true, isActive: true },
      orderBy: { code: "asc" },
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/admin/branches" className="text-sm text-blue-700 hover:underline">
          ← {t.branches.title}
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{t.branches.newTitle}</h2>

        <div className="mt-5">
          <BranchForm mode="create" warehouses={warehouses} labels={{ ...t.branches, saving: t.branches.saving }} />
        </div>
      </section>
    </div>
  );
}
