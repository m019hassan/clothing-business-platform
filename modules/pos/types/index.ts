export type PosCatalogItemView = {
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  productId: string;
  productName: string;
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
