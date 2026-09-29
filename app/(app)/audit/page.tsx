import Link from "next/link";
import { redirect } from "next/navigation";

import { listAuditActions, listAuditLog } from "@/modules/audit/application/audit-log";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { formatDate } from "@/src/lib/format";
import { toAppError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.AUDIT_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.audit.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{t.audit.permissionHint}</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const offset = Math.max(Number.parseInt(single(params.offset) || "0", 10) || 0, 0);
  const action = single(params.action);

  let page;
  let actions: string[] = [];
  let loadError = false;

  try {
    [page, actions] = await Promise.all([
      listAuditLog(account, { limit: 25, offset }, { action: action || undefined }),
      listAuditActions(account),
    ]);
  } catch (error) {
    void toAppError(error);
    loadError = true;
  }

  if (loadError || !page) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-rose-800">{t.audit.loadErrorTitle}</p>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
      </section>
    );
  }

  const { rows, pagination } = page;
  const rangeStart = rows.length === 0 ? pagination.offset : pagination.offset + 1;
  const rangeEnd = pagination.offset + rows.length;
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + rows.length < pagination.total;
  const actionLabels = t.audit.actions as Record<string, string>;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.audit.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.audit.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.audit.subtitle}</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{t.audit.action}</span>
            <select
              name="action"
              defaultValue={action}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">{t.audit.allActions}</option>
              {actions.map((entry) => (
                <option key={entry} value={entry}>
                  {actionLabels[entry] ?? entry}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {t.deliveries.apply}
          </button>
        </form>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.audit.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{t.audit.emptyHint}</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="hidden w-full text-start text-sm sm:table">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">{t.audit.action}</th>
                <th scope="col" className="px-6 py-3">{t.audit.entity}</th>
                <th scope="col" className="px-6 py-3">{t.audit.actor}</th>
                <th scope="col" className="px-6 py-3">{t.audit.when}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-medium text-slate-900">{actionLabels[row.action] ?? row.action}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {row.entity}
                    {row.entityId ? <span className="ms-1 text-xs text-slate-400">{row.entityId.slice(0, 8)}…</span> : null}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{row.actorName ?? row.actorEmail ?? t.audit.system}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <p className="text-sm font-medium text-slate-900">{actionLabels[row.action] ?? row.action}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.entity} · {row.actorName ?? row.actorEmail ?? t.audit.system}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(row.createdAt)}</p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
            <p>
              {t.common.showing} <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> {t.common.of}{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex gap-2">
              {hasPrevious ? (
                <Link
                  href={`/audit?offset=${Math.max(pagination.offset - pagination.limit, 0)}${action ? `&action=${action}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.previous}
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/audit?offset=${pagination.offset + pagination.limit}${action ? `&action=${action}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.next}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.next}
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
