const PRODUCT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  ARCHIVED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function ProductStatusBadge({
  status,
  labels,
}: {
  status: string;
  /** Translated labels; without them the raw status is shown. */
  labels?: Record<string, string>;
}) {
  const style = PRODUCT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {labels?.[status] ?? status}
    </span>
  );
}
