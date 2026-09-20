import type { CartStatus } from "@prisma/client";

export type CartItemView = {
  id: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  currency: string;
  availableQuantity: number;
};

export type CartView = {
  id: string | null;
  status: CartStatus;
  items: CartItemView[];
  total: string;
};

export type AddItemInput = {
  variantId: string;
  quantity: number;
};

export type UpdateItemInput = {
  quantity: number;
};
