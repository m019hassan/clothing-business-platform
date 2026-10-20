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

export type ProfitRow = {
  productId: string;
  productName: string;
  netUnits: number;
  revenue: string;
  cost: string;
  profit: string;
  /** Units sold on lines that carry no recorded cost snapshot. */
  missingCostUnits: number;
  currency: string;
};

export type ProfitReportView = {
  period: ReportPeriod;
  totals: {
    revenue: string;
    cost: string;
    profit: string;
    netUnits: number;
    missingCostUnits: number;
  };
  rows: ProfitRow[];
  currency: string;
};

/** One sale line, already reduced to its net (post-return) units. */
export type ProfitLine = {
  productId: string;
  productName: string;
  netUnits: number;
  unitPrice: string;
  unitCost: string | null;
  currency: string;
  /** What the paid total divided by the shelf lines; folds in tax and invoice discounts. */
  paidFactor?: string;
};
