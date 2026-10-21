import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getUser } from "@/modules/users/application/users";
import { UserRowActions } from "@/modules/users/components/user-row-actions";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

type EditUserPageProps = { params: Promise<{ id: string }> };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();
  const canManage = permissions.has(PERMISSIONS.USERS_MANAGE);
  const { id } = await params;

  let user = null;

  try {
    user = await getUser(account, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    user = null;
  }

  if (!user) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.adminUsers.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
        <Link href="/admin" className="mt-4 inline-flex text-sm font-semibold text-rose-800 underline">
          {t.adminUsers.title}
        </Link>
      </section>
    );
  }

  const firstName = user.displayName.split(" ")[0] ?? "";
  const lastName = user.displayName.split(" ").slice(1).join(" ");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          ← {t.adminUsers.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{user.displayName}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {user.accountType}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {user.status}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow label={t.usersAdmin.email} value={user.email ?? "—"} />
          <DetailRow label={t.usersAdmin.phone} value={user.phone} />
          <DetailRow label={t.adminUsers.roles} value={user.roles.length === 0 ? "—" : user.roles.map((role) => role.name).join(", ")} />
          <DetailRow label={t.adminUsers.joined} value={formatDate(user.createdAt)} />
          <DetailRow label={t.adminUsers.account} value={user.profileCode ?? "—"} />
          <DetailRow label={t.usersAdmin.jobTitle} value={user.jobTitle ?? "—"} />
          <DetailRow label={t.adminUsers.roles} value={user.roles.length === 0 ? "—" : user.roles.map((role) => role.name).join(", ")} />
          <DetailRow label={t.adminUsers.lastLoginPrefix} value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"} />
        </dl>
      </section>

      {canManage ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">{t.adminUsers.manage}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Edit the identity, contact and status, or issue a new password.
          </p>

          <div className="mt-4 max-w-3xl">
            <UserRowActions
              labels={{ ...t.usersAdmin, saving: t.catalog.form.saving, statusLabels: t.accountStatus as Record<string, string> }}
              accountId={user.id}
              firstName={firstName}
              lastName={lastName}
              email={user.email ?? ""}
              phone={user.phone}
              status={user.status}
              branchId={user.branchId}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
