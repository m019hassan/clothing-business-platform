import type { OrderStatus, PaymentStatus } from "@prisma/client";

export type ReportPeriod = "all" | "7d" | "30d" | "90d";

export type SalesReportBlock = {
  placedCount: number;
  placedTotal: string;
  confirmedCount: number;
  confirmedTotal: string;
  averageOrderValue: string;
  cancelledCount: number;
  cancelledTotal: string;
  byStatus: { status: OrderStatus; count: number; total: string }[];
};

export type TopProductRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: string;
  currency: string;
};

export type TopCustomerRow = {
  customerCode: string;
  customerName: string;
  orders: number;
  revenue: string;
  currency: string;
};

export type PaymentsReportBlock = {
  total: number;
  byStatus: { status: PaymentStatus; count: number; amount: string }[];
};

export type ReportsOverviewView = {
  period: ReportPeriod;
  sales: SalesReportBlock | null;
  topProducts: TopProductRow[] | null;
  topCustomers: TopCustomerRow[] | null;
  payments: PaymentsReportBlock | null;
  inventory: {
    trackedRows: number;
    totalOnHand: number;
    totalReserved: number;
    totalAvailable: number;
    lowStockRows: number;
    outOfStockRows: number;
  } | null;
};
