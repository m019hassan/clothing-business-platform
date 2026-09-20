import { LOW_STOCK_THRESHOLD, stockLevel, type StockLevel } from "@/src/lib/inventory/stock-level";

const STOCK_STYLES: Record<StockLevel, string> = {
  IN_STOCK: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOW_STOCK: "bg-amber-50 text-amber-700 ring-amber-200",
  OUT_OF_STOCK: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STOCK_LABELS: Record<StockLevel, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export { LOW_STOCK_THRESHOLD, stockLevel };

export function StockBadge({ availableQuantity }: { availableQuantity: number }) {
  const level = stockLevel(availableQuantity);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STOCK_STYLES[level]}`}
    >
      {STOCK_LABELS[level]}
    </span>
  );
}
