import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getDistributorDashboard } from "@/modules/pos/application/pos-dashboard";
import { getPosCatalog } from "@/modules/pos/application/pos-sales";
import { PosDashboardCards } from "@/modules/pos/components/pos-dashboard-cards";
import { PosTerminal } from "@/modules/pos/components/pos-terminal";
import { AuthorizationError } from "@/src/lib/errors";

export default async function PosPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  if (account.accountType !== "DISTRIBUTOR" || !account.distributorProfile) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Point of sale requires a distributor account</p>
        <p className="mt-1 text-sm text-slate-500">
          Ask an administrator to create a distributor account linked to your branch.
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

  let catalog;
  let dashboard;

  try {
    [catalog, dashboard] = await Promise.all([
      getPosCatalog(account),
      getDistributorDashboard(account),
    ]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Point of sale</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {catalog.branchName} ({catalog.branchCode})
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sell directly from the branch stock. Every sale is confirmed immediately with a cash payment and the stock
          ledger records it.
        </p>
      </section>

      <PosDashboardCards dashboard={dashboard} />

      <PosTerminal catalog={catalog} />
    </div>
  );
}
