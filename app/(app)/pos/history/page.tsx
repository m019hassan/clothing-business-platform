import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listPosSales } from "@/modules/pos/application/pos-returns";
import { AuthorizationError } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { SalesSearchFilter } from "@/modules/pos/components/sales-search-filter";

export const dynamic = "force-dynamic";

export default async function PosHistoryPage() {
  const account = await requireAuthenticated();
  const { t, locale } = await getInterfaceLanguage();

  let sales;

  try {
    sales = await listPosSales(account);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <Link href="/pos" className="text-sm text-blue-700 hover:underline">
          ← {t.pos.kicker}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.posHistory.title}</h1>
        <p className="text-sm text-slate-600">{t.posHistory.subtitle}</p>
      </header>

      {sales.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-slate-500 shadow-sm">
          {t.posHistory.empty}
        </p>
      ) : (
        <SalesSearchFilter
          sales={sales}
          locale={locale}
          labels={t.posHistory}
        />
      )}
    </div>
  );
}
