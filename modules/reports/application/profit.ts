import "server-only";

import { Prisma } from "@prisma/client";

import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { GLOBAL_BRANCH_SCOPE, type BranchScope } from "@/modules/branches/application/scope";
import { REVENUE_STATUSES, periodStart } from "@/modules/reports/application/reports";
import type { ProfitLine, ProfitReportView, ProfitRow, ReportPeriod } from "@/modules/reports/types";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

/**
 * Profit reporting. Revenue uses the stored sale price; cost uses the snapshot
 * taken when the line was sold, so editing a product cost later never rewrites
 * the profit of past days.
 */
export type ProfitComputation = {
  rows: ProfitRow[];
  totals: {
    revenue: string;
    cost: string;
    profit: string;
    netUnits: number;
    missingCostUnits: number;
  };
  currency: string;
};

export function computeProfitReport(lines: ProfitLine[]): ProfitComputation {
  const byProduct = new Map<
    string,
    { productName: string; netUnits: number; revenue: Prisma.Decimal; cost: Prisma.Decimal; missingCostUnits: number; currency: string }
  >();

  let revenue = new Prisma.Decimal(0);
  let cost = new Prisma.Decimal(0);
  let netUnits = 0;
  let missingCostUnits = 0;
  let currency = "EGP";

  for (const line of lines) {
    if (line.netUnits <= 0) {
      continue;
    }

    currency = line.currency || currency;

    const factor = line.paidFactor ? new Prisma.Decimal(line.paidFactor) : new Prisma.Decimal(1);
    const lineRevenue = new Prisma.Decimal(line.unitPrice).mul(line.netUnits).mul(factor).toDecimalPlaces(2);
    const lineCost =
      line.unitCost === null ? new Prisma.Decimal(0) : new Prisma.Decimal(line.unitCost).mul(line.netUnits);

    const entry = byProduct.get(line.productId) ?? {
      productName: line.productName,
      netUnits: 0,
      revenue: new Prisma.Decimal(0),
      cost: new Prisma.Decimal(0),
      missingCostUnits: 0,
      currency: line.currency,
    };

    entry.netUnits += line.netUnits;
    entry.revenue = entry.revenue.add(lineRevenue);
    entry.cost = entry.cost.add(lineCost);

    if (line.unitCost === null) {
      entry.missingCostUnits += line.netUnits;
    }

    byProduct.set(line.productId, entry);
    revenue = revenue.add(lineRevenue);
    cost = cost.add(lineCost);
    netUnits += line.netUnits;

    if (line.unitCost === null) {
      missingCostUnits += line.netUnits;
    }
  }

  const rows: ProfitRow[] = [...byProduct.entries()]
    .map(([productId, entry]) => ({
      productId,
      productName: entry.productName,
      netUnits: entry.netUnits,
      revenue: entry.revenue.toFixed(2),
      cost: entry.cost.toFixed(2),
      profit: entry.revenue.sub(entry.cost).toFixed(2),
      missingCostUnits: entry.missingCostUnits,
      currency: entry.currency,
    }))
    .sort((a, b) => new Prisma.Decimal(b.profit).comparedTo(new Prisma.Decimal(a.profit)));

  return {
    rows,
    totals: {
      revenue: revenue.toFixed(2),
      cost: cost.toFixed(2),
      profit: revenue.sub(cost).toFixed(2),
      netUnits,
      missingCostUnits,
    },
    currency,
  };
}

export async function getProfitReport(
  permissions: ReadonlySet<string>,
  period: ReportPeriod,
  scope: BranchScope = GLOBAL_BRANCH_SCOPE,
): Promise<ProfitReportView> {
  const empty: ProfitReportView = {
    period,
    totals: { revenue: "0.00", cost: "0.00", profit: "0.00", netUnits: 0, missingCostUnits: 0 },
    rows: [],
    currency: "EGP",
  };

  if (!permissions.has(PERMISSIONS.PRODUCTS_COST_VIEW) || !permissions.has(PERMISSIONS.ORDERS_VIEW)) {
    return empty;
  }

  return withDatabaseError(async () => {
    const since = periodStart(period);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: since },
          ...(scope.branchId ? { branchId: scope.branchId } : {}),
        },
      },
      select: {
        quantity: true,
        returnedQuantity: true,
        unitPrice: true,
        unitCost: true,
        order: { select: { id: true, currency: true, totalAmount: true } },
        variant: { select: { productId: true, product: { select: { name: true } } } },
      },
    });

    // Revenue must match what buyers actually paid: one factor per order,
    // folding in tax and any invoice-level discount.
    const rawByOrder = new Map<string, Prisma.Decimal>();
    const totalsByOrder = new Map<string, Prisma.Decimal>();

    for (const item of items) {
      rawByOrder.set(
        item.order.id,
        (rawByOrder.get(item.order.id) ?? new Prisma.Decimal(0)).add(item.unitPrice.mul(item.quantity)),
      );

      if (!totalsByOrder.has(item.order.id)) {
        totalsByOrder.set(item.order.id, item.order.totalAmount);
      }
    }

    const factorByOrder = new Map<string, string>();

    for (const [orderId, raw] of rawByOrder.entries()) {
      const total = totalsByOrder.get(orderId) ?? raw;
      factorByOrder.set(orderId, raw.gt(0) ? total.div(raw).toFixed(6) : "1");
    }

    const lines: ProfitLine[] = items.map((item) => ({
      productId: item.variant.productId,
      productName: item.variant.product.name,
      netUnits: item.quantity - item.returnedQuantity,
      unitPrice: item.unitPrice.toString(),
      unitCost: item.unitCost?.toString() ?? null,
      currency: item.order.currency,
      paidFactor: factorByOrder.get(item.order.id) ?? "1",
    }));

    const computed = computeProfitReport(lines);

    return { period, totals: computed.totals, rows: computed.rows, currency: computed.currency };
  });
}
