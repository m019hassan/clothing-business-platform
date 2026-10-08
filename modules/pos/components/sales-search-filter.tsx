"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { PosHistoryRow } from "@/modules/pos/application/pos-returns";
import { PosReturnPanel } from "@/modules/pos/components/pos-return-panel";
import { SearchIcon, FilterIcon } from "@/components/ui/icons";
import { formatMoney } from "@/src/lib/format";

/** Status filter values – "ALL" means no filter */
type StatusFilter = "ALL" | "SOLD" | "PARTIAL" | "RETURNED";

interface Labels {
  searchPlaceholder: string;
  filterAll: string;
  filterSold: string;
  filterPartial: string;
  filterReturned: string;
  noResults: string;
  statusSold: string;
  statusPartial: string;
  statusReturned: string;
  sold: string;
  returned: string;
  refunded: string;
  unitsReturned: string;
  return: string;
  returnDone: string;
  sellReplacement: string;
  returnTitle: string;
  quantity: string;
  confirmReturn: string;
  voidSale: string;
  voidConfirm: string;
  cancel: string;
  exchangeHint: string;
  link: string;
  openInvoice: string;
}

interface SalesSearchFilterProps {
  sales: PosHistoryRow[];
  locale: string;
  labels: Labels;
}

function getStatus(sale: PosHistoryRow): StatusFilter {
  if (sale.status === "RETURNED") return "RETURNED";
  if (sale.returnedUnits > 0) return "PARTIAL";
  return "SOLD";
}

export function SalesSearchFilter({ sales, locale, labels }: SalesSearchFilterProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [locale],
  );

  /** Normalise Arabic/English numerals and diacritics for fuzzy matching */
  function normalise(str: string) {
    return str
      .toLowerCase()
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
      .replace(/[\u064b-\u065f]/g, "") // strip diacritics
      .trim();
  }

  const filtered = useMemo(() => {
    const q = normalise(query);

    return sales.filter((sale) => {
      // Status filter
      if (activeFilter !== "ALL" && getStatus(sale) !== activeFilter) return false;

      // Text search: order number OR date string
      if (q) {
        const dateStr = normalise(dateFormat.format(new Date(sale.createdAt)));
        const orderStr = normalise(sale.orderNumber);
        if (!orderStr.includes(q) && !dateStr.includes(q)) return false;
      }

      return true;
    });
  }, [sales, query, activeFilter, dateFormat]);

  const filterButtons: { key: StatusFilter; label: string; active: string; inactive: string }[] = [
    {
      key: "ALL",
      label: labels.filterAll,
      active: "bg-slate-800 text-white",
      inactive: "bg-white text-slate-700 hover:bg-slate-50",
    },
    {
      key: "SOLD",
      label: labels.filterSold,
      active: "bg-emerald-600 text-white",
      inactive: "bg-white text-emerald-700 hover:bg-emerald-50",
    },
    {
      key: "PARTIAL",
      label: labels.filterPartial,
      active: "bg-amber-500 text-white",
      inactive: "bg-white text-amber-700 hover:bg-amber-50",
    },
    {
      key: "RETURNED",
      label: labels.filterReturned,
      active: "bg-rose-600 text-white",
      inactive: "bg-white text-rose-700 hover:bg-rose-50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Search + filter bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <SearchIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-3 ps-9 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            aria-label={labels.searchPlaceholder}
          />
        </div>

        {/* Status filter chips */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="فلترة حسب الحالة"
        >
          <FilterIcon className="h-4 w-4 shrink-0 text-slate-400" />
          {filterButtons.map(({ key, label, active, inactive }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={[
                "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold transition",
                activeFilter === key ? active : inactive,
              ].join(" ")}
              aria-pressed={activeFilter === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results count ── */}
      <p className="text-xs text-slate-500">
        {filtered.length === sales.length
          ? `${sales.length} عملية`
          : `${filtered.length} من ${sales.length} عملية`}
      </p>

      {/* ── Sales list ── */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          {labels.noResults}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((sale) => {
            const remaining = sale.soldUnits - sale.returnedUnits;
            const status = getStatus(sale);

            const badge =
              status === "RETURNED"
                ? { text: labels.statusReturned, className: "bg-rose-100 text-rose-800" }
                : status === "PARTIAL"
                  ? { text: labels.statusPartial, className: "bg-amber-100 text-amber-800" }
                  : { text: labels.statusSold, className: "bg-emerald-100 text-emerald-800" };

            return (
              <li key={sale.orderId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Row header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {sale.orderNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateFormat.format(new Date(sale.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={["rounded-full px-2.5 py-0.5 text-xs font-semibold", badge.className].join(" ")}
                    >
                      {badge.text}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatMoney(sale.totalAmount, sale.currency)}
                    </p>
                  </div>
                </div>

                {/* Line items */}
                <ul className="divide-y divide-slate-50 px-5 py-2 text-sm">
                  {sale.lines.map((line) => (
                    <li
                      key={line.orderItemId}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                    >
                      <span className="text-slate-700">
                        {line.productName}{" "}
                        <span className="font-mono text-xs text-slate-400">{line.sku}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {labels.sold} {line.quantity}
                        {line.returnedQuantity > 0
                          ? ` · ${labels.returned} ${line.returnedQuantity}`
                          : ""}{" "}
                        · {formatMoney(line.unitPrice, sale.currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Row footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {labels.refunded}: {formatMoney(sale.refundedAmount, sale.currency)}
                    {sale.returnedUnits > 0
                      ? ` · ${labels.unitsReturned.replace("{count}", String(sale.returnedUnits))}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pos/sales/${sale.orderId}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {labels.openInvoice}
                    </Link>
                    {remaining > 0 ? <PosReturnPanel sale={sale} labels={labels} /> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
