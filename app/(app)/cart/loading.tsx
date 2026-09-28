import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function CartLoading() {
  const { t } = await getInterfaceLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
      <p className="sr-only">{t.common.loading}</p>
    </div>
  );
}
