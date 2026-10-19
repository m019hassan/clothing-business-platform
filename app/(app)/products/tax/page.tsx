import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getTaxSetting } from "@/modules/catalog/application/taxes";
import { TaxSettingsForm } from "@/modules/catalog/components/tax-settings-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TaxSettingsPage() {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.PRODUCTS_UPDATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.tax.permissionTitle}</p>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.products}
        </Link>
      </section>
    );
  }

  const setting = await getTaxSetting();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.nav.products}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.tax.title}</h1>
        <p className="text-sm text-slate-600">{t.tax.subtitle}</p>
      </div>

      <TaxSettingsForm
        initial={setting}
        labels={{
          enabled: t.tax.enabled,
          disabled: t.tax.disabled,
          rateLabel: t.tax.rateLabel,
          inclusive: t.tax.inclusive,
          exclusive: t.tax.exclusive,
          save: t.tax.save,
          saving: t.tax.saving,
          saved: t.tax.saved,
          invalidRate: t.tax.invalidRate,
        }}
      />

      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {t.tax.note}
      </p>
    </div>
  );
}
