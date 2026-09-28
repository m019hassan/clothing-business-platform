import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function ProductsLoading() {
  const { t } = await getInterfaceLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <p className="sr-only">{t.common.loading}</p>
    </div>
  );
}
