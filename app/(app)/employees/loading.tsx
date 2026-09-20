export default function EmployeesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <p className="sr-only">Loading employees…</p>
    </div>
  );
}
