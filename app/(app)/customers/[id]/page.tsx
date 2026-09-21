import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountStatusBadge } from "@/components/account/account-status-badge";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCustomer } from "@/modules/customers/application/customers";
import type { CustomerDetailView } from "@/modules/customers/types";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate, formatMoney } from "@/src/lib/format";

type CustomerDetailPageProps = {
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

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
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
          href="/customers"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back
        </Link>
      </section>
    );
  }

  const { id } = await params;

  let customer: CustomerDetailView | null = null;

  try {
    customer = await getCustomer(account, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const displayName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Customer</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{displayName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AccountStatusBadge status={customer.accountStatus} />
              <span className="text-sm text-slate-500">{customer.customerCode}</span>
              <span className="text-sm text-slate-500">
                {customer.classificationName ?? "Unclassified"}
              </span>
            </div>
          </div>
          <Link
            href="/customers"
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            All customers
          </Link>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Email" value={customer.email ?? "Not provided"} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Gender" value={customer.gender ?? "Not specified"} />
          <InfoRow
            label="Birth date"
            value={customer.birthDate ? formatDate(customer.birthDate) : "Not specified"}
          />
          <InfoRow label="Marketing consent" value={customer.marketingConsent ? "Granted" : "Not granted"} />
          <InfoRow label="Joined" value={formatDate(customer.createdAt)} />
          <InfoRow
            label="Last login"
            value={customer.lastLoginAt ? formatDate(customer.lastLoginAt) : "Never"}
          />
          <InfoRow label="Orders" value={String(customer.orderCount)} />
        </dl>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Recent orders</h3>
          <p className="text-sm text-slate-500">
            The {customer.recentOrders.length} most recent order{customer.recentOrders.length === 1 ? "" : "s"} of{" "}
            {customer.orderCount}.
          </p>
        </div>

        {customer.recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">This customer has no orders yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3">Order</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-right">Total</th>
                <th scope="col" className="px-6 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customer.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4">
                    <Link href={`/orders/${order.id}`} className="font-medium text-slate-900 hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700">
                    {formatMoney(order.totalAmount, order.currency)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Editing customers</h3>
        <p className="mt-1 text-sm text-slate-500">
          Customer administration (classification, notes, account status) is not implemented yet; this screen is
          read-only.
        </p>
      </section>
    </div>
  );
}
