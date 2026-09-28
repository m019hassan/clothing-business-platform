import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function PaymentsLoading() {
  const { t } = await getInterfaceLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <p className="sr-only">{t.common.loading}</p>
    </div>
  );
}
