import type { StockMovementType } from "@prisma/client";

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

export type StockMovementView = {
  id: string;
  variantId: string;
  sku: string;
  warehouseId: string;
  warehouseCode: string;
  type: StockMovementType;
  quantityChange: number;
  quantityOnHandAfter: number;
  quantityReservedAfter: number;
  reason: string | null;
  orderId: string | null;
  actorAccountId: string | null;
  createdAt: string;
};

export type AdjustmentResultView = {
  variantId: string;
  sku: string;
  warehouseId: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
};
