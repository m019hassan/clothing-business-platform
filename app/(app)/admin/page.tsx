import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBranches } from "@/modules/branches/application/branches";
import { UserCreateForm } from "@/modules/users/components/user-create-form";
import { UserRowActions } from "@/modules/users/components/user-row-actions";
import {
  listUsers,
  parseUserListFilters,
  type UserListFilters,
} from "@/modules/users/application/users";
import type { UserListItemView } from "@/modules/users/types";
import { prisma } from "@/src/lib/db";
import { formatDate } from "@/src/lib/format";

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "CUSTOMER", label: "Customers" },
  { value: "EMPLOYEE", label: "Employees" },
  { value: "DISTRIBUTOR", label: "Distributors" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

type AdminPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string; type?: string; status?: string; q?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));

  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.USERS_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Account administration requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the users.view permission. Ask a manager to grant it.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);
  const canManage = permissions.has(PERMISSIONS.USERS_MANAGE);

  const query = new URLSearchParams();
  for (const key of ["type", "status", "q"] as const) {
    const value = params[key];

    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  }

  let filters: UserListFilters = {};
  let filterError = false;

  try {
    filters = parseUserListFilters(query);
  } catch {
    filters = {};
    filterError = true;
  }

  let users: UserListItemView[] = [];
  let total = 0;
  let loadError = false;

  try {
    const page = await listUsers(account, { limit, offset }, filters);
    users = page.users;
    total = page.pagination.total;
  } catch {
    loadError = true;
  }

  const branches = canManage ? await listBranches(account, { includeInactive: true }).catch(() => []) : [];
  const roles = canManage
    ? await prisma.role
        .findMany({ where: { isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } })
        .catch(() => [])
    : [];

  const rangeStart = users.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + users.length;
  const hasNext = offset + users.length < total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Administration</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Accounts</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create employees and customers, assign roles and branches, suspend accounts and reset passwords.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Name, email, phone or code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="type" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={params.type ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-4">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Apply
            </button>
            {query.size > 0 ? (
              <Link href="/admin" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                Clear
              </Link>
            ) : null}
            {filterError ? (
              <p role="alert" className="text-sm text-rose-700">
                Invalid filter, showing every account.
              </p>
            ) : null}
          </div>
        </form>
      </section>

      {canManage ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">New account</h3>
          <p className="mt-1 text-sm text-slate-500">
            The password is hashed on the server; share it with the person and ask them to change it.
          </p>
          <UserCreateForm branches={branches} roles={roles} />
        </section>
      ) : null}

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">Unable to load accounts</h3>
          <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Account</th>
                  <th scope="col" className="px-6 py-3">Contact</th>
                  <th scope="col" className="px-6 py-3">Roles</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Joined</th>
                  {canManage ? <th scope="col" className="px-6 py-3">Manage</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{user.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {user.profileCode ?? "—"} · {user.accountType}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <p>{user.email ?? "—"}</p>
                      <p className="text-xs text-slate-500">{user.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {user.roles.length === 0 ? "—" : user.roles.map((role) => role.name).join(", ")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {user.status}
                      </span>
                      {user.lastLoginAt ? (
                        <p className="mt-1 text-xs text-slate-500">Last login {formatDate(user.lastLoginAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                    {canManage ? (
                      <td className="px-6 py-4">
                        <UserRowActions
                          accountId={user.id}
                          displayName={user.displayName}
                          status={user.status}
                          branchId={user.branchId}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              {offset > 0 ? (
                <Link
                  href={`/admin?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Previous</span>
              )}
              {hasNext ? (
                <Link
                  href={`/admin?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Next</span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
