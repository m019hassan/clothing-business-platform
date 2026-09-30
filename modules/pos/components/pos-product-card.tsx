"use client";

import { useEffect, useMemo, useState } from "react";

import type { PosCatalogItemView } from "@/modules/pos/types";
import { formatMoney } from "@/src/lib/format";
import { stockLevel } from "@/src/lib/inventory/stock-level";

type Labels = {
  addToSale: string;
  availableInRow: string;
  colorLabel: string;
  sizeLabel: string;
};

/** Numeric sizes first, smallest to largest; anything else after them. */
function orderSizes(sizes: string[]): string[] {
  const rank = (size: string) => (/^\d+$/.test(size) ? Number(size) : Number.POSITIVE_INFINITY);

  return [...sizes].sort((left, right) => {
    const leftRank = rank(left);
    const rightRank = rank(right);

    return leftRank === rightRank ? left.localeCompare(right) : leftRank - rightRank;
  });
}

/**
 * One card per product: its photo and name, then every colour and every size. A chip
 * that cannot be picked for the current combination is dashed and greyed rather than
 * hidden, so the choices stay visible. Colour first, then size; picking a colour keeps
 * a size the new colour also has.
 */
export function PosProductCard({
  items,
  labels,
  preferEnglish = false,
  onAdd,
}: {
  items: PosCatalogItemView[];
  labels: Labels;
  preferEnglish?: boolean;
  onAdd: (item: PosCatalogItemView) => void;
}) {
  const colors = useMemo(() => {
    const seen = new Map<string, { hex: string | null; nameEn: string | null }>();

    for (const item of items) {
      if (item.color && !seen.has(item.color)) {
        seen.set(item.color, { hex: item.colorHex, nameEn: item.colorNameEn });
      }
    }

    return [...seen.entries()].map(([name, entry]) => ({ name, ...entry }));
  }, [items]);

  const allSizes = useMemo(
    () => orderSizes([...new Set(items.map((item) => item.size).filter((size): size is string => Boolean(size)))]),
    [items],
  );

  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);

  const findItem = (colorName: string | null, sizeName: string | null) =>
    items.find(
      (item) => (colorName === null || item.color === colorName) && (sizeName === null || item.size === sizeName),
    ) ?? null;

  const selected = useMemo(() => {
    const exact = findItem(color, size);

    if (exact) {
      return exact;
    }

    return items.find((item) => item.availableQuantity > 0) ?? items[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, color, size]);

  // When the colour changes, keep the size only if the new colour has it.
  useEffect(() => {
    if (size !== null && !findItem(color, size)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const level = selected ? stockLevel(selected.availableQuantity) : "IN_STOCK";
  const soldOut = !selected || selected.availableQuantity <= 0;

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {items[0].imageId ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/api/products/images/${items[0].imageId}`}
          alt={items[0].productName}
          className="h-28 w-full bg-slate-50 object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-slate-50 text-2xl font-bold text-slate-300">
          {items[0].productName.slice(0, 1)}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{items[0].productName}</p>

        {colors.length > 1 ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{labels.colorLabel}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {colors.map((entry) => {
                const variants = items.filter((item) => item.color === entry.name);
                const hasSize = size === null || variants.some((item) => item.size === size);
                const sellable = variants.some((item) => item.availableQuantity > 0);
                const unavailable = !hasSize || !sellable;
                const isSelected = color === entry.name;

                return (
                  <button
                    key={entry.name}
                    type="button"
                    // Tapping the chosen colour lets go of the size, which frees every
                    // colour that the current size was greying out.
                    onClick={() => {
                      if (isSelected) {
                        setSize(null);
                        return;
                      }

                      setColor(entry.name);
                    }}
                    disabled={unavailable && !isSelected}
                    aria-pressed={isSelected}
                    title={
                      unavailable
                        ? `${preferEnglish ? (entry.nameEn ?? entry.name) : entry.name} · ${labels.availableInRow} 0`
                        : preferEnglish
                          ? (entry.nameEn ?? entry.name)
                          : entry.name
                    }
                    className={[
                      "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : unavailable
                          ? "cursor-not-allowed border-dashed border-slate-300 text-slate-400 line-through decoration-slate-400"
                          : "border-slate-200 text-slate-600 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-3 w-3 rounded-full border border-black/10",
                        unavailable && !isSelected ? "opacity-40" : "",
                      ].join(" ")}
                      style={{ backgroundColor: entry.hex ?? "transparent" }}
                    />
                    {preferEnglish ? (entry.nameEn ?? entry.name) : entry.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{labels.sizeLabel}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {allSizes.map((sizeName) => {
              const variant = findItem(color, sizeName);
              const unavailable = !variant || variant.availableQuantity <= 0;
              const isSelected = selected?.size === sizeName && selected?.color === color;

              return (
                <button
                  key={sizeName}
                  type="button"
                  onClick={() => setSize(sizeName)}
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  title={
                    variant
                      ? `${variant.sku} · ${labels.availableInRow} ${variant.availableQuantity}`
                      : `${sizeName} · ${labels.availableInRow} 0`
                  }
                  className={[
                    "rounded-md border px-2 py-0.5 text-sm font-bold transition-colors",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : unavailable
                        ? "cursor-not-allowed border-dashed border-slate-300 text-slate-400 line-through decoration-slate-400"
                        : "border-slate-200 text-slate-800 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {sizeName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold text-slate-800">
            {selected ? formatMoney(selected.unitPrice, selected.currency) : "—"}
          </span>
          {selected ? (
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                soldOut
                  ? "bg-rose-100 text-rose-800"
                  : level === "LOW_STOCK"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800",
              ].join(" ")}
            >
              {labels.availableInRow} {selected.availableQuantity}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => selected && onAdd(selected)}
          disabled={soldOut}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {labels.addToSale}
        </button>
      </div>
    </li>
  );
}
