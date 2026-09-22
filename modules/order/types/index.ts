import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import type { OrderDeliveryView } from "@/modules/delivery/types";

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

export type OrderDeliveryAddressView = {
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: string;
  totalAmount: string;
  createdAt: string;
  addressId: string | null;
  deliveryAddress: OrderDeliveryAddressView | null;
  delivery: OrderDeliveryView | null;
  items: OrderItemView[];
  payment: OrderPaymentView | null;
};
