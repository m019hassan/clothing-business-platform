"use client";

import { useMemo, useState } from "react";

import type { PosCatalogItemView } from "@/modules/pos/types";
import { formatMoney } from "@/src/lib/format";
import { stockLevel } from "@/src/lib/inventory/stock-level";

type Labels = {
  addToSale: string;
  availableInRow: string;
  colorLabel: string;
  sizeLabel: string;
};

/**
 * One card per product: its photo and name, then the colours (each with its swatch
 * from the library) and the sizes of the chosen colour. Picking a combination is
 * what the add button puts in the sale, so a product never appears twice.
 */
export function PosProductCard({
  items,
  labels,
  onAdd,
}: {
  items: PosCatalogItemView[];
  labels: Labels;
  onAdd: (item: PosCatalogItemView) => void;
}) {
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();

    for (const item of items) {
      if (item.color && !seen.has(item.color)) {
        seen.set(item.color, item.colorHex);
      }
    }

    return [...seen.entries()].map(([name, hex]) => ({ name, hex }));
  }, [items]);

  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);

  const sizes = useMemo(
    () => items.filter((item) => (color === null ? true : item.color === color)),
    [items, color],
  );

  const [size, setSize] = useState<string | null>(null);

  const selected =
    sizes.find((item) => (size === null ? sizes[0]?.variantId === item.variantId : item.size === size)) ??
    sizes[0] ??
    items[0];

  const level = selected ? stockLevel(selected.availableQuantity) : "IN_STOCK";
  const soldOut = !selected || selected.availableQuantity <= 0;

  const pickColor = (name: string) => {
    setColor(name);
    setSize(null);
  };

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
              {colors.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => pickColor(entry.name)}
                  aria-pressed={color === entry.name}
                  className={[
                    "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                    color === entry.name
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: entry.hex ?? "transparent" }}
                  />
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{labels.sizeLabel}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sizes.map((item) => {
              const itemSoldOut = item.availableQuantity <= 0;

              return (
                <button
                  key={item.variantId}
                  type="button"
                  onClick={() => setSize(item.size)}
                  disabled={itemSoldOut}
                  aria-pressed={selected?.variantId === item.variantId}
                  title={`${item.sku} · ${labels.availableInRow} ${item.availableQuantity}`}
                  className={[
                    "rounded-md border px-2 py-0.5 text-sm font-bold transition-colors",
                    selected?.variantId === item.variantId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-800 hover:bg-slate-100",
                    itemSoldOut ? "cursor-not-allowed line-through opacity-40" : "",
                  ].join(" ")}
                >
                  {item.size ?? "—"}
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
