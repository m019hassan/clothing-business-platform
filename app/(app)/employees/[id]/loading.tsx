import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function EmployeeDetailLoading() {
  const { t } = await getInterfaceLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
      <p className="sr-only">{t.common.loading}</p>
    </div>
  );
}
