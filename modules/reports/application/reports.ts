import "server-only";

import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getInventorySummary } from "@/modules/inventory/application/inventory";
import type {
  PaymentsReportBlock,
  ReportPeriod,
  ReportsOverviewView,
  SalesReportBlock,
  TopCustomerRow,
  TopProductRow,
} from "@/modules/reports/types";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

/**
 * Reporting reads. Every figure is aggregated by the database from existing
 * models; the frontend never recalculates business totals.
 *
 * Money note: OrderItem.unitPrice is the stored sale price snapshot, so
 * revenue = SUM(unitPrice * quantity). Discounts and refunds are not part of
 * the current data model (discountAmount is always 0 and no refund amounts are
 * stored), so gross/net distinctions are not reported.
 */

// Statuses treated as realised sales. Cancelled, returned and refunded orders
// are reported separately instead of being counted as revenue.
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const PERIOD_DAYS: Record<ReportPeriod, number | null> = {
  all: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseReportPeriod(value: string | undefined): ReportPeriod {
  return value === "7d" || value === "30d" || value === "90d" ? value : "all";
}

function periodStart(period: ReportPeriod): Date {
  const days = PERIOD_DAYS[period];

  if (days === null) {
    return new Date(0);
  }

  // Rolling window in UTC; timezone-independent by design.
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type SalesRow = { status: OrderStatus; count: number; total: Prisma.Decimal };

export async function getReportsOverview(
  permissions: ReadonlySet<string>,
  period: ReportPeriod,
): Promise<ReportsOverviewView> {
  const canViewOrders = permissions.has(PERMISSIONS.ORDERS_VIEW);
  const canViewPayments = permissions.has(PERMISSIONS.PAYMENTS_VIEW);
  const canViewInventory = permissions.has(PERMISSIONS.INVENTORY_VIEW);
  const canViewCustomers = permissions.has(PERMISSIONS.CUSTOMERS_VIEW);

  const since = periodStart(period);

  return withDatabaseError(async () => {
    const [byStatusRows, paymentsByStatus, topProducts, topCustomers, inventory] =
      await Promise.all([
        canViewOrders
          ? prisma.$queryRaw<SalesRow[]>`
              SELECT "status", COUNT(*)::int AS count, SUM("totalAmount") AS total
              FROM "Order"
              WHERE "createdAt" >= ${since}
              GROUP BY "status"
            `
          : Promise.resolve(null),
        canViewPayments
          ? prisma.payment.groupBy({
              by: ["status"],
              where: { createdAt: { gte: since } },
              _count: { _all: true },
              _sum: { amount: true },
            })
          : Promise.resolve(null),
        canViewOrders ? getTopProducts(since) : Promise.resolve(null),
        canViewOrders && canViewCustomers ? getTopCustomers(since) : Promise.resolve(null),
        canViewInventory ? getInventorySummary() : Promise.resolve(null),
      ]);

    let sales: SalesReportBlock | null = null;

    if (byStatusRows) {
      const countFor = (statuses: OrderStatus[]) =>
        byStatusRows
          .filter((row) => statuses.includes(row.status))
          .reduce((sum, row) => sum + row.count, 0);
      const totalFor = (statuses: OrderStatus[]) =>
        byStatusRows
          .filter((row) => statuses.includes(row.status))
          .reduce((sum, row) => sum.add(row.total), new Prisma.Decimal(0));

      const placedCount = byStatusRows.reduce((sum, row) => sum + row.count, 0);
      const placedTotal = totalFor(Object.values(OrderStatus));
      const confirmedCount = countFor(REVENUE_STATUSES);
      const confirmedTotal = totalFor(REVENUE_STATUSES);
      const cancelledTotal = totalFor([OrderStatus.CANCELLED]);

      sales = {
        placedCount,
        placedTotal: placedTotal.toString(),
        confirmedCount,
        confirmedTotal: confirmedTotal.toString(),
        averageOrderValue:
          confirmedCount > 0
            ? confirmedTotal.div(confirmedCount).toDecimalPlaces(2).toString()
            : "0",
        cancelledCount: countFor([OrderStatus.CANCELLED]),
        cancelledTotal: cancelledTotal.toString(),
        byStatus: Object.values(OrderStatus).map((status) => {
          const row = byStatusRows.find((entry) => entry.status === status);

          return {
            status,
            count: row?.count ?? 0,
            total: (row?.total ?? new Prisma.Decimal(0)).toString(),
          };
        }),
      };
    }

    let payments: PaymentsReportBlock | null = null;

    if (paymentsByStatus) {
      payments = {
        total: paymentsByStatus.reduce((sum, row) => sum + row._count._all, 0),
        byStatus: Object.values(PaymentStatus).map((status) => {
          const row = paymentsByStatus.find((entry) => entry.status === status);

          return {
            status,
            count: row?._count._all ?? 0,
            amount: (row?._sum.amount ?? new Prisma.Decimal(0)).toString(),
          };
        }),
      };
    }

    return {
      period,
      sales,
      topProducts,
      topCustomers,
      payments,
      inventory,
    };
  });
}

async function getTopProducts(since: Date): Promise<TopProductRow[]> {
  const rows = await prisma.$queryRaw<
    { productId: string; quantity: number; revenue: Prisma.Decimal }[]
  >`
    SELECT v."productId" AS "productId",
           SUM(oi."quantity")::int AS quantity,
           SUM(oi."unitPrice" * oi."quantity") AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "ProductVariant" v ON v.id = oi."variantId"
    WHERE o."status"::text IN (${Prisma.join(REVENUE_STATUSES)}) AND o."createdAt" >= ${since}
    GROUP BY v."productId"
    ORDER BY revenue DESC
    LIMIT 5
  `;

  if (rows.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((row) => row.productId) } },
    select: { id: true, name: true, currency: true },
  });

  return rows.map((row) => {
    const product = products.find((entry) => entry.id === row.productId);

    return {
      productId: row.productId,
      productName: product?.name ?? "Unknown product",
      quantity: row.quantity,
      revenue: row.revenue.toString(),
      currency: product?.currency ?? "SAR",
    };
  });
}

async function getTopCustomers(since: Date): Promise<TopCustomerRow[]> {
  const rows = await prisma.$queryRaw<
    { customerProfileId: string; orders: number; revenue: Prisma.Decimal }[]
  >`
    SELECT o."customerProfileId" AS "customerProfileId",
           COUNT(*)::int AS orders,
           SUM(o."totalAmount") AS revenue
    FROM "Order" o
    WHERE o."status"::text IN (${Prisma.join(REVENUE_STATUSES)}) AND o."createdAt" >= ${since}
    GROUP BY o."customerProfileId"
    ORDER BY revenue DESC
    LIMIT 5
  `;

  if (rows.length === 0) {
    return [];
  }

  const profiles = await prisma.customerProfile.findMany({
    where: { id: { in: rows.map((row) => row.customerProfileId) } },
    select: { id: true, customerCode: true, firstName: true, lastName: true },
  });

  return rows.map((row) => {
    const profile = profiles.find((entry) => entry.id === row.customerProfileId);

    return {
      customerCode: profile?.customerCode ?? "—",
      customerName: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Unknown",
      orders: row.orders,
      revenue: row.revenue.toString(),
      currency: "SAR",
    };
  });
}
