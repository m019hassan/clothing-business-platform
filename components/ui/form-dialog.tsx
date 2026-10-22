"use client";

import { useState, type ReactNode } from "react";

import { XIcon } from "@/components/ui/icons";

/** A modal that hosts a create form, so short forms never need their own page. */
export function FormDialog({
  trigger,
  title,
  subtitle,
  isArabic = true,
  children,
}: {
  trigger: string;
  title: string;
  subtitle?: string;
  isArabic?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        {trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-xs sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isArabic ? "إغلاق" : "Close"}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
