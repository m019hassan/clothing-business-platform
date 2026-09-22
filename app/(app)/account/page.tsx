import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountStatusBadge } from "@/components/account/account-status-badge";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getAccountOverview } from "@/modules/customers/application/account";
import type { AccountOverviewView } from "@/modules/customers/types";
import { listAddresses } from "@/modules/customers/application/addresses";
import { AddressManager } from "@/modules/customers/components/address-manager";
import { getCustomerProfile } from "@/modules/customers/application/profile";
import { CustomerProfileForm } from "@/modules/customers/components/customer-profile-form";
import { AccountPreferencesForm } from "@/modules/notification/components/account-preferences-form";
import { NotificationPreferencesForm } from "@/modules/notification/components/notification-preferences-form";
import {
  getAccountPreferences,
  getNotificationPreferences,
} from "@/modules/notification/application/notifications";
import type {
  AccountPreferenceView,
  NotificationPreferenceView,
} from "@/modules/notification/types";
import { listOrders } from "@/modules/order/application/orders";
import { AuthorizationError } from "@/src/lib/errors";
import { formatDate } from "@/src/lib/format";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function AccountPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  let overview: AccountOverviewView | null = null;
  let loadError = false;

  try {
    overview = await getAccountOverview(account);
  } catch {
    loadError = true;
  }

  let customerProfile: Awaited<ReturnType<typeof getCustomerProfile>> | null = null;

  if (overview?.customer) {
    try {
      customerProfile = await getCustomerProfile(account);
    } catch {
      customerProfile = null;
    }
  }

  let accountPreferences: AccountPreferenceView | null = null;
  let notificationPreferences: NotificationPreferenceView[] | null = null;

  try {
    [accountPreferences, notificationPreferences] = await Promise.all([
      getAccountPreferences(account),
      getNotificationPreferences(account),
    ]);
  } catch {
    accountPreferences = null;
    notificationPreferences = null;
  }

  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];

  if (overview?.customer) {
    try {
      addresses = await listAddresses(account);
    } catch {
      addresses = [];
    }
  }

  let orderTotal: number | null = null;

  if (overview?.customer) {
    try {
      const page = await listOrders(account, { limit: 1, offset: 0 });
      orderTotal = page.pagination.total;
    } catch (error) {
      if (!(error instanceof AuthorizationError)) {
        orderTotal = null;
      }
    }
  }

  if (loadError || overview === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load your account</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
      </section>
    );
  }

  const displayName = overview.customer
    ? [overview.customer.firstName, overview.customer.lastName].filter(Boolean).join(" ")
    : (overview.employee?.jobTitle ?? "Staff member");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Account</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{displayName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AccountStatusBadge status={overview.status} />
              <span className="text-sm text-slate-500">
                {overview.accountType === "CUSTOMER" ? "Customer account" : "Employee account"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {customerProfile ? (
              <>
                <a
                  href="#profile"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Edit profile
                </a>
                <p className="max-w-[220px] text-right text-xs text-slate-400">
                  Update your name, gender and birth date.
                </p>
              </>
            ) : (
              <p className="max-w-[220px] text-right text-xs text-slate-400">
                Employee details are maintained by the store&apos;s administrator.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Account information</h3>
          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Email" value={overview.email ?? "Not provided"} />
            <InfoRow label="Phone" value={overview.phone} />
            <InfoRow
              label="Email verified"
              value={overview.emailVerified ? "Yes" : "No"}
            />
            <InfoRow
              label="Phone verified"
              value={overview.phoneVerified ? "Yes" : "No"}
            />
            <InfoRow label="Language" value={overview.preferredLanguage.toUpperCase()} />
            <InfoRow label="Timezone" value={overview.timezone} />
            <InfoRow label="Member since" value={formatDate(overview.createdAt)} />
            <InfoRow
              label="Last login"
              value={overview.lastLoginAt ? formatDate(overview.lastLoginAt) : "—"}
            />
          </dl>
        </section>

        {overview.customer ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Customer profile</h3>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Customer code" value={overview.customer.customerCode} />
              <InfoRow
                label="Classification"
                value={overview.customer.classificationName ?? "Unclassified"}
              />
              <InfoRow label="Gender" value={overview.customer.gender ?? "Not specified"} />
              <InfoRow
                label="Birth date"
                value={overview.customer.birthDate ? formatDate(overview.customer.birthDate) : "Not specified"}
              />
              <InfoRow
                label="Marketing consent"
                value={overview.customer.marketingConsent ? "Granted" : "Not granted"}
              />
            </dl>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Employee profile</h3>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow label="Employee number" value={overview.employee?.employeeNumber ?? "—"} />
              <InfoRow label="Department" value={overview.employee?.departmentName ?? "—"} />
              <InfoRow label="Job title" value={overview.employee?.jobTitle ?? "—"} />
            </dl>
            <p className="mt-5 text-xs text-slate-500">
              Staff tools (order and inventory management) arrive in a later phase.
            </p>
          </section>
        )}
      </div>

      {customerProfile ? (
        <section id="profile" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold text-slate-900">Profile</h3>
            <p className="text-xs text-slate-500">Customer code {customerProfile.customerCode}</p>
          </div>
          <CustomerProfileForm profile={customerProfile} />
        </section>
      ) : null}

      {accountPreferences ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold text-slate-900">Preferences</h3>
            <p className="text-xs text-slate-500">
              Language, timezone and marketing consent are stored on your account.
            </p>
          </div>
          <AccountPreferencesForm
            preferences={accountPreferences}
            canManageMarketing={overview.customer !== null}
          />
          {notificationPreferences ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
              <p className="mt-1 text-xs text-slate-500">
                Choose which in-app notifications you want to receive.
              </p>
              <NotificationPreferencesForm preferences={notificationPreferences} />
            </div>
          ) : null}
        </section>
      ) : null}

      {overview.customer ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/orders"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">Order history</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {orderTotal === null ? "—" : orderTotal}
            </p>
            <p className="mt-1 text-xs text-slate-400">View all orders</p>
          </Link>
          <Link
            href="/cart"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">Shopping cart</p>
            <p className="mt-2 text-sm text-slate-700">Review reserved items</p>
            <p className="mt-1 text-xs text-slate-400">Go to cart</p>
          </Link>
          <Link
            href="/products"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-slate-500">Catalog</p>
            <p className="mt-2 text-sm text-slate-700">Browse products</p>
            <p className="mt-1 text-xs text-slate-400">Go to products</p>
          </Link>
        </section>
      ) : null}

      {overview.customer ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold text-slate-900">Delivery addresses</h3>
            <p className="text-xs text-slate-500">
              Orders store a copy of the address, so edits never rewrite past orders.
            </p>
          </div>
          <div className="mt-5">
            <AddressManager addresses={addresses} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
