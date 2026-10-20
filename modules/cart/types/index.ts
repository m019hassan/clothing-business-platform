import type { CartStatus } from "@prisma/client";

export type CartItemView = {
  id: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  productId: string;
  productName: string;
  /** First product photo, for the cart row thumbnail. */
  imageId?: string | null;
  quantity: number;
  unitPrice: string;
  /** Set while an active discount applies to this product. */
  discountPercent?: number | null;
  originalUnitPrice?: string | null;
  lineTotal: string;
  currency: string;
  availableQuantity: number;
};

export type CartView = {
  id: string | null;
  status: CartStatus;
  items: CartItemView[];
  /** Net of VAT; equals total when prices already include it. */
  subtotal: string;
  taxAmount: string;
  /** What the customer actually pays. */
  total: string;
};

export type AddItemInput = {
  variantId: string;
  quantity: number;
};

export type UpdateItemInput = {
  quantity: number;
};
