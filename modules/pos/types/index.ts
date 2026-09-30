export type PosCatalogItemView = {
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  productId: string;
  productName: string;
  /** The product's first photo, for the card view. */
  imageId: string | null;
  /** The library colour behind the name, for the swatch; null for legacy names. */
  colorHex: string | null;
  unitPrice: string;
  currency: string;
  availableQuantity: number;
};

export type PosCatalogView = {
  branchId: string;
  branchCode: string;
  branchName: string;
  items: PosCatalogItemView[];
};

export type PosReceiptLineView = {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type PosReceiptView = {
  orderId: string;
  orderNumber: string;
  status: string;
  currency: string;
  totalAmount: string;
  itemCount: number;
  branchCode: string;
  soldBy: string;
  createdAt: string;
  lines: PosReceiptLineView[];
};

export type PosSalesBlock = {
  orders: number;
  items: number;
  total: string;
};

export type PosStockBlock = {
  trackedItems: number;
  totalOnHand: number;
  totalAvailable: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type PosShortageRow = {
  variantId: string;
  sku: string;
  productName: string;
  availableQuantity: number;
};

export type PosTopSellerRow = {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  revenue: string;
};

export type PosDashboardView = {
  branchId: string;
  branchCode: string;
  branchName: string;
  timezone: string;
  salesToday: PosSalesBlock;
  salesThisMonth: PosSalesBlock;
  stock: PosStockBlock;
  shortages: PosShortageRow[];
  topSellers: PosTopSellerRow[];
};
