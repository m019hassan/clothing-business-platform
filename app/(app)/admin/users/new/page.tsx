import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBranches } from "@/modules/branches/application/branches";
import { UserCreateForm } from "@/modules/users/components/user-create-form";
import { prisma } from "@/src/lib/db";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.USERS_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.adminUsers.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{t.adminUsers.permissionHint}</p>
        <Link
          href="/admin"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.adminUsers.title}
        </Link>
      </section>
    );
  }

  const branches = await listBranches(account, { includeInactive: true }).catch(() => []);
  const roles = await prisma.role
    .findMany({ where: { isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          ← {t.adminUsers.title}
        </Link>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          {t.adminUsers.newAccountTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          The password is hashed on the server; share it with the person and ask them to change it.
        </p>

        <UserCreateForm
          branches={branches}
          roles={roles}
          labels={{ ...t.usersAdmin, phonePlaceholder: t.addresses.phonePlaceholder }}
        />
      </section>
    </div>
  );
}
