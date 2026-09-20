// Threshold source: docs/01-product/business-rules.md (low stock alert below 10 units).
export const LOW_STOCK_THRESHOLD = 10;

export type StockLevel = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function stockLevel(availableQuantity: number): StockLevel {
  if (availableQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  return availableQuantity < LOW_STOCK_THRESHOLD ? "LOW_STOCK" : "IN_STOCK";
}
