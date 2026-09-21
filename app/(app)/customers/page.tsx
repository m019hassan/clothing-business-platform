import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountStatusBadge } from "@/components/account/account-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import {
  listCustomers,
  parseCustomerListFilters,
  type CustomerListFilters,
} from "@/modules/customers/application/customers";
import type { CustomerListView } from "@/modules/customers/types";
import { formatDate } from "@/src/lib/format";

const PAGE_SIZE = 20;

type CustomersPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string; q?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));

  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.CUSTOMERS_VIEW)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Customer access requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the customers.view permission. Ask a manager to grant it.
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

  const query = new URLSearchParams();
  if (typeof params.q === "string" && params.q.length > 0) {
    query.set("q", params.q);
  }

  let filters: CustomerListFilters = {};
  let filterError = false;

  try {
    filters = parseCustomerListFilters(query);
  } catch {
    filters = {};
    filterError = true;
  }

  let customers: CustomerListView[] = [];
  let total = 0;
  let loadError = false;

  try {
    const page = await listCustomers(account, { limit, offset }, filters);
    customers = page.customers;
    total = page.pagination.total;
  } catch {
    loadError = true;
  }

  const rangeStart = customers.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + customers.length;
  const hasNext = offset + customers.length < total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Directory</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Customers</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registered customers with their account status and order counts.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Name, customer code, email or phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Search
            </button>
            {query.size > 0 ? (
              <Link href="/customers" className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        {filterError ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            The search term was invalid, so the full directory is shown.
          </p>
        ) : null}
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">Unable to load customers</h3>
          <p className="mt-1 text-sm text-rose-700">
            The directory could not be retrieved right now. Please refresh the page to try again.
          </p>
        </section>
      ) : customers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No customers found</p>
          <p className="mt-1 text-sm text-slate-500">
            {offset > 0 ? "You have reached the end of the directory." : "Try a different search term."}
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">Customer</th>
                    <th scope="col" className="px-6 py-3">Contact</th>
                    <th scope="col" className="px-6 py-3">Classification</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Orders</th>
                    <th scope="col" className="px-6 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => {
                    const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900 hover:underline">
                            {name}
                          </Link>
                          <p className="text-xs text-slate-500">{customer.customerCode}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <p>{customer.email ?? "—"}</p>
                          <p className="text-xs text-slate-500">{customer.phone}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{customer.classificationName ?? "—"}</td>
                        <td className="px-6 py-4">
                          <AccountStatusBadge status={customer.accountStatus} />
                        </td>
                        <td className="px-6 py-4 text-right text-slate-700">{customer.orderCount}</td>
                        <td className="px-6 py-4 text-slate-600">{formatDate(customer.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 sm:hidden">
              {customers.map((customer) => (
                <li key={customer.id} className="px-5 py-4">
                  <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900">
                    {[customer.firstName, customer.lastName].filter(Boolean).join(" ")}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {customer.customerCode} · {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{customer.email ?? customer.phone}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              {offset > 0 ? (
                <Link
                  href={`/customers?offset=${Math.max(offset - limit, 0)}&limit=${limit}${filters.search ? `&q=${encodeURIComponent(filters.search)}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Previous
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/customers?offset=${offset + limit}&limit=${limit}${filters.search ? `&q=${encodeURIComponent(filters.search)}` : ""}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Next
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
