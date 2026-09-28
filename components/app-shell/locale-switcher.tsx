"use client";

import { useTransition } from "react";

import { setLocaleAction } from "@/src/lib/i18n/actions";
import { LOCALE_NAMES, nextLocale, type Locale } from "@/src/lib/i18n";

/** One-click switch to the other language. */
export function LocaleSwitcher({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const target = nextLocale(locale);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(target);
        })
      }
      className={
        className ??
        "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {LOCALE_NAMES[target]}
    </button>
  );
}
