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

export type PaymentSimulationResult = {
  order: OrderView;
  payment: PaymentView;
};
