const ACCOUNT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  SUSPENDED: "bg-orange-50 text-orange-700 ring-orange-200",
  LOCKED: "bg-rose-50 text-rose-700 ring-rose-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function AccountStatusBadge({ status }: { status: string }) {
  const style = ACCOUNT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
