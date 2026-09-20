import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export type OrderItemView = {
  id: string;
  variantId: string;
  sku: string;
  size: string | null;
  color: string | null;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  discountAmount: string;
  lineTotal: string;
};

export type OrderSummaryView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type OrderListPage = {
  orders: OrderSummaryView[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type OrderPaymentView = {
  status: PaymentStatus;
  amount: string;
  currency: string;
  method: PaymentMethod | null;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  createdAt: string;
  items: OrderItemView[];
  payment: OrderPaymentView | null;
};
