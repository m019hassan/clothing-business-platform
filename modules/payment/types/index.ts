import type { PaymentMethod, PaymentStatus } from "@prisma/client";

import type { OrderView } from "@/modules/order/types";

export type PaymentOutcome = "success" | "failure";

export type PaymentView = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  method: PaymentMethod | null;
  createdAt: string;
};

export type PendingPaymentRow = {
  orderId: string;
  orderNumber: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  itemCount: number;
  customerName: string;
  customerCode: string;
  customerContact: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paymentAmount: string;
};

export type PendingPaymentPage = {
  rows: PendingPaymentRow[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type PaymentSimulationResult = {
  order: OrderView;
  payment: PaymentView;
};
