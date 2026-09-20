import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountStatusBadge } from "@/components/account/account-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getEmployee } from "@/modules/employees/application/employees";
import type { EmployeeDetailView } from "@/modules/employees/types";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate } from "@/src/lib/format";

type EmployeeDetailProps = {
  params: Promise<{ id: string }>;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.EMPLOYEES_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Employee access requires a staff role</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
          Back to dashboard
        </Link>
      </section>
    );
  }

  const { id } = await params;

  let employee: EmployeeDetailView | null = null;
  let loadError = false;

  try {
    employee = await getEmployee(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    loadError = true;
  }

  if (loadError || employee === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load this employee</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
        <Link href="/employees" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          Back to employees
        </Link>
      </section>
    );
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/employees" className="font-medium text-slate-600 hover:text-blue-700">
          Employees
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-slate-800">{fullName}</span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Employee</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{fullName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AccountStatusBadge status={employee.accountStatus} />
              <span className="text-sm text-slate-500">{employee.employeeNumber}</span>
              {employee.jobTitle ? <span className="text-sm text-slate-500">{employee.jobTitle}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              disabled
              title="Employee management endpoints do not exist yet"
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              Edit employee
            </button>
            <button
              type="button"
              disabled
              title="Employee management endpoints do not exist yet"
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              Assign role
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Account information</h3>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Email" value={employee.email ?? "Not provided"} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Department" value={employee.departmentName ?? "—"} />
            <InfoRow label="Hire date" value={employee.hireDate ? formatDate(employee.hireDate) : "—"} />
            <InfoRow label="Language" value={employee.preferredLanguage.toUpperCase()} />
            <InfoRow label="Timezone" value={employee.timezone} />
            <InfoRow label="Account created" value={formatDate(employee.createdAt)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Assigned roles</h3>
          {employee.roles.length > 0 ? (
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {employee.roles.map((role) => (
                <li key={role} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                  {role}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No active role is assigned. This employee has no permissions.
            </p>
          )}
          <p className="mt-5 text-xs text-slate-500">
            Effective permissions come from the assigned roles; direct employee permissions are not part of the
            current model.
          </p>
        </section>
      </div>
    </div>
  );
}
