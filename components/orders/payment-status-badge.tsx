const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  AUTHORIZED: "bg-blue-50 text-blue-700 ring-blue-200",
  PENDING_VERIFICATION: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  REFUNDED: "bg-teal-50 text-teal-700 ring-teal-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  AUTHORIZED: "Authorized",
  PENDING_VERIFICATION: "Pending verification",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const style = PAYMENT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {paymentStatusLabel(status)}
    </span>
  );
}
