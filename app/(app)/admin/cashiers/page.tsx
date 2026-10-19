import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCashiers } from "@/modules/pos/application/cashiers";
import { CashierDiscountForm } from "@/modules/pos/components/cashier-discount-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CashiersPage() {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.USERS_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.cashiers.permissionTitle}</p>
        <Link
          href="/admin"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.adminAccounts}
        </Link>
      </section>
    );
  }

  const cashiers = await listCashiers(account);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          ← {t.nav.adminAccounts}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.cashiers.title}</h1>
        <p className="text-sm text-slate-600">{t.cashiers.subtitle}</p>
      </div>

      {cashiers.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          {t.cashiers.empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {cashiers.map((cashier) => (
            <li key={cashier.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {cashier.name} <span className="font-mono text-xs text-slate-400">{cashier.code}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {cashier.branchName} ({cashier.branchCode})
                  </p>
                </div>
                <CashierDiscountForm
                  cashierId={cashier.id}
                  initial={{
                    canDiscount: cashier.canDiscount,
                    code: cashier.discountCode ?? "",
                    percent: cashier.discountPercent ?? "",
                  }}
                  labels={{
                    canDiscount: t.cashiers.canDiscount,
                    code: t.cashiers.code,
                    percent: t.cashiers.percent,
                    save: t.cashiers.save,
                    saving: t.cashiers.saving,
                    saved: t.cashiers.saved,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
