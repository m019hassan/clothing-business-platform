import type { DeliveryStatus } from "@prisma/client";

export type DeliveryView = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: DeliveryStatus;
  carrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryQueueItemView = DeliveryView & {
  orderStatus: string;
  customerName: string;
  customerCode: string;
  totalAmount: string;
  currency: string;
};

export type DeliveryListPage = {
  deliveries: DeliveryQueueItemView[];
  pagination: { limit: number; offset: number; total: number };
};

/** Customer-facing projection embedded in the order view. */
export type OrderDeliveryView = {
  status: DeliveryStatus;
  carrier: string | null;
  trackingNumber: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
};
