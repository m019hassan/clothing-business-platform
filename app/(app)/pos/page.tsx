import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getDistributorDashboard } from "@/modules/pos/application/pos-dashboard";
import { getPosCatalog } from "@/modules/pos/application/pos-sales";
import { PosDashboardCards } from "@/modules/pos/components/pos-dashboard-cards";
import { CashierModeToggle } from "@/modules/pos/components/cashier-mode-toggle";
import { PosTerminal } from "@/modules/pos/components/pos-terminal";
import { AuthorizationError } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function PosPage() {
  const { t, locale } = await getInterfaceLanguage();
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  if (account.accountType !== "DISTRIBUTOR" || !account.distributorProfile) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.pos.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.pos.permissionHint}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.common.backToDashboard}
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.pos.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              {catalog.branchName} ({catalog.branchCode})
            </h2>
          </div>
          <Link
            href="/pos/history"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t.posHistory.link}
          </Link>
          <CashierModeToggle />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {t.pos.subtitle}
        </p>
      </section>

      <div className="pos-stats">
        <PosDashboardCards
        dashboard={dashboard}
        labels={{ ...t.pos, each: t.cart.each, openInvoice: t.posInvoice.openInvoice }}
        />
      </div>

      <PosTerminal
        catalog={catalog}
        labels={{ ...t.pos, each: t.cart.each, openInvoice: t.posInvoice.openInvoice }}
        preferEnglish={locale === "en"}
        errors={t.errors}
      />
    </div>
  );
}
