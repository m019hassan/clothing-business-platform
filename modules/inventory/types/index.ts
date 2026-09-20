export type InventoryRowView = {
  id: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  variantStatus: string;
  productId: string;
  productName: string;
  warehouseName: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  updatedAt: string;
};

export type InventorySummaryView = {
  trackedRows: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockRows: number;
  outOfStockRows: number;
};

export type InventoryPageView = {
  rows: InventoryRowView[];
  summary: InventorySummaryView;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};
