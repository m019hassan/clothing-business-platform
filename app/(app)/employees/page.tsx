import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountStatusBadge } from "@/components/account/account-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listEmployees } from "@/modules/employees/application/employees";
import type { EmployeePageView } from "@/modules/employees/types";
import { formatDate } from "@/src/lib/format";
import { parsePaginationParams } from "@/src/lib/validation";

const PAGE_SIZE = 10;

type EmployeesPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.EMPLOYEES_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Employee access requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the employees.view permission. Ask a manager to grant it.
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const searchParamsObject = new URLSearchParams();

  if (params.offset !== undefined) searchParamsObject.set("offset", params.offset);
  searchParamsObject.set("limit", params.limit ?? String(PAGE_SIZE));

  let page: EmployeePageView | null = null;
  let loadError = false;

  try {
    page = await listEmployees(parsePaginationParams(searchParamsObject));
  } catch {
    loadError = true;
  }

  if (loadError || page === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load employees</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
      </section>
    );
  }

  const { rows, pagination } = page;
  const rangeStart = rows.length === 0 ? pagination.offset : pagination.offset + 1;
  const rangeEnd = pagination.offset + rows.length;
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + rows.length < pagination.total;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Administration</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Employees</h2>
          <p className="mt-1 text-sm text-slate-600">
            {pagination.total} employee account{pagination.total === 1 ? "" : "s"}.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Employee management endpoints do not exist yet"
          className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
        >
          Add employee
        </button>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No employees yet</p>
          <p className="mt-1 text-sm text-slate-500">Employee accounts created through the seed script appear here.</p>
        </section>
      ) : (
        <>
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Employee</th>
                  <th scope="col" className="px-6 py-3">Contact</th>
                  <th scope="col" className="px-6 py-3">Department</th>
                  <th scope="col" className="px-6 py-3">Roles</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Hired</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/employees/${row.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {[row.firstName, row.lastName].filter(Boolean).join(" ")}
                      </Link>
                      <p className="text-xs text-slate-500">{row.employeeNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <p>{row.email ?? "—"}</p>
                      <p className="text-xs text-slate-500">{row.phone}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">{row.departmentName ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {row.roles.length > 0 ? row.roles.join(", ") : <span className="text-slate-400">No role</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <AccountStatusBadge status={row.accountStatus} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                      {row.hireDate ? formatDate(row.hireDate) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/employees/${row.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/employees/${row.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {[row.firstName, row.lastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="truncate text-xs text-slate-500">{row.employeeNumber}</p>
                  </div>
                  <AccountStatusBadge status={row.accountStatus} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Department</dt>
                    <dd className="truncate text-slate-800">{row.departmentName ?? "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Roles</dt>
                    <dd className="truncate text-slate-800">{row.roles.length > 0 ? row.roles.join(", ") : "No role"}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link href={`/employees?offset=${Math.max(pagination.offset - pagination.limit, 0)}&limit=${pagination.limit}`} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100">
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Previous</span>
              )}
              {hasNext ? (
                <Link href={`/employees?offset=${pagination.offset + pagination.limit}&limit=${pagination.limit}`} className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100">
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Next</span>
              )}
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Read-only administration</h3>
        <p className="mt-1 text-sm text-slate-500">
          Creating employees, changing account status and assigning roles have no backend endpoints yet, so this
          screen only displays the existing records. Salary, national ID and internal notes are never shown.
        </p>
      </section>
    </div>
  );
}
