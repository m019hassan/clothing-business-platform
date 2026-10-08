/*
  InvoiceCard component – replaces the old table view for a POS invoice.
  Shows order number, date, branch, seller, status badge, totals and payment info.
  Tailwind classes respect RTL layout and dark mode (via the existing Tailwind config).
*/

"use client";

import {
  CheckCircle2Icon,
  XIcon,
  HistoryIcon,
} from "@/components/ui/icons";

type PosInvoiceStatus = "RETURNED" | "PARTIAL" | "SOLD";

interface InvoiceCardProps {
  id: string;
  orderNumber: string;
  createdAt: string;
  branchName: string;
  branchCode: string;
  soldBy?: string;
  status: PosInvoiceStatus;
  net: string; // formatted net amount
  total: string; // formatted total amount
  refunded: string; // formatted refunded amount
  paymentMethod: string;
  soldUnits: number;
  returnedUnits: number;
}

export function InvoiceCard({
  id: _id, // eslint-disable-line @typescript-eslint/no-unused-vars
  orderNumber,
  createdAt,
  branchName,
  branchCode,
  soldBy,
  status,
  net,
  total,
  refunded,
  paymentMethod,
  soldUnits,
  returnedUnits,
}: InvoiceCardProps) {
  const statusMap = {
    RETURNED: {
      label: "تم الإرجاع",
      badgeClass: "bg-rose-100 text-rose-800",
      cardBg: "bg-rose-50",
      icon: <XIcon className="h-4 w-4 text-rose-600" />,
    },
    PARTIAL: {
      label: "جزئي",
      badgeClass: "bg-amber-100 text-amber-800",
      cardBg: "bg-amber-50",
      icon: <HistoryIcon className="h-4 w-4 text-amber-600" />,
    },
    SOLD: {
      label: "مباع",
      badgeClass: "bg-emerald-100 text-emerald-800",
      cardBg: "bg-emerald-50",
      icon: <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />,
    },
  };

  const { label, badgeClass, cardBg, icon } = statusMap[status];

  return (
    <article
      className={`rounded-xl border border-slate-200 p-5 shadow-sm ${cardBg} dark:border-slate-700 dark:bg-slate-800`}
    >
      {/* Header: order number + date */}
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
            {orderNumber}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {new Intl.DateTimeFormat("default", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(new Date(createdAt))}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
        >
          {icon}
          {label}
        </span>
      </header>

      {/* Branch & seller */}
      <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
        <p className="font-semibold">
          {branchName}{" "}
          <span className="font-normal text-slate-500">({branchCode})</span>
        </p>
        {soldBy && <p className="mt-0.5 text-xs text-slate-500">{soldBy}</p>}
      </div>

      {/* Financial summary */}
      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500 dark:text-slate-400">المجموع</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">
            {total}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500 dark:text-slate-400">المسترد</dt>
          <dd className="text-slate-700 dark:text-slate-300">{refunded}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-600">
          <dt className="font-medium text-slate-700 dark:text-slate-200">
            الصافي
          </dt>
          <dd className="text-base font-bold text-slate-900 dark:text-slate-100">
            {net}
          </dd>
        </div>
      </dl>

      {/* Footer: payment & units */}
      <footer className="mt-4 flex flex-wrap gap-x-3 border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <span>طريقة الدفع: {paymentMethod}</span>
        <span>مباع: {soldUnits}</span>
        {returnedUnits > 0 && <span>مسترجع: {returnedUnits}</span>}
      </footer>
    </article>
  );
}
