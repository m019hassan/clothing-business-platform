import type { OrderStatus } from "@prisma/client";
import type { InventorySummaryView } from "@/modules/inventory/types";

export type DashboardOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  createdAt: string;
};

export type DashboardOrdersBlock = {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  cancelled: number;
};

export type DashboardPaymentsBlock = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type DashboardCustomersBlock = {
  total: number;
};

export type DashboardOperationsView = {
  orders: DashboardOrdersBlock | null;
  payments: DashboardPaymentsBlock | null;
  inventory: InventorySummaryView | null;
  customers: DashboardCustomersBlock | null;
};

export type DashboardSummary = {
  scope: "customer" | "business";
  orderCount: number;
  pendingOrderCount: number;
  productCount: number;
  lowStockCount: number;
  recentOrders: DashboardOrderRow[];
};
