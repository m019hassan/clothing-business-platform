"use client";

import { PrinterIcon } from "@/components/ui/icons";

/**
 * Triggers the browser's print dialog for the invoice. The button is sized for
 * thumbs (44px+ tall) because it is mostly pressed on phones at the counter.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] print:hidden"
    >
      <PrinterIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
