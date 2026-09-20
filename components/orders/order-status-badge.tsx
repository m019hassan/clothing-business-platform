const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  READY_TO_SHIP: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  SHIPPED: "bg-violet-50 text-violet-700 ring-violet-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
  RETURNED: "bg-orange-50 text-orange-700 ring-orange-200",
  REFUNDED: "bg-teal-50 text-teal-700 ring-teal-200",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function OrderStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
