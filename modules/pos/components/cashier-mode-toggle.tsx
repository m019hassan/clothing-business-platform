"use client";

import { useEffect, useState } from "react";

/**
 * Cashier mode: a small switch that hides the shell (sidebar and header) and the big
 * statistic cards, letting the till fill the whole screen. The choice is remembered,
 * and the document flag drives it from the global stylesheet.
 */
export function CashierModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Reading after mount keeps the first render identical on the server and the client.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setEnabled(window.localStorage.getItem("pos-cashier-mode") === "true");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.cashier = enabled ? "1" : "0";
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem("pos-cashier-mode", String(next));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={[
        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
        enabled
          ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
          : "border-slate-300 text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {enabled ? "خروج من وضع الكاشير" : "وضع الكاشير (ملء الشاشة)"}
    </button>
  );
}
