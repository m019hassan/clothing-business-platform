import type { OrderStatus } from "@prisma/client";

export type DashboardOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  createdAt: string;
};

export type DashboardSummary = {
  scope: "customer" | "business";
  orderCount: number;
  pendingOrderCount: number;
  productCount: number;
  lowStockCount: number;
  recentOrders: DashboardOrderRow[];
};
