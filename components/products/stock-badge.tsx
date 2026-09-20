const LOW_STOCK_THRESHOLD = 10;

export type StockLevel = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

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

// Threshold source: docs/01-product/business-rules.md (low stock alert below 10 units).
export function stockLevel(availableQuantity: number): StockLevel {
  if (availableQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  return availableQuantity < LOW_STOCK_THRESHOLD ? "LOW_STOCK" : "IN_STOCK";
}

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
