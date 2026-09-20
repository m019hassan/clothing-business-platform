export default function AccountLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
      <p className="sr-only">Loading account…</p>
    </div>
  );
}
