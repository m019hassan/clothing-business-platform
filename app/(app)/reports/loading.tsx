import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function ReportsLoading() {
  const { t } = await getInterfaceLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <p className="sr-only">{t.common.loading}</p>
    </div>
  );
}
