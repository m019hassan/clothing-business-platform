import "server-only";

import { OrderChannel, OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type {
  PosDashboardView,
  PosSalesBlock,
  PosShortageRow,
  PosStockBlock,
  PosTopSellerRow,
} from "@/modules/pos/types";
import { prisma } from "@/src/lib/db";
import { AuthorizationError } from "@/src/lib/errors";
import { stockLevel } from "@/src/lib/inventory/stock-level";
import { withDatabaseError } from "@/src/lib/errors";
import { startOfDayInTimeZone, startOfMonthInTimeZone } from "@/src/lib/time";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const TOP_SELLER_WINDOW_DAYS = 30;
const TOP_SELLER_LIMIT = 5;
const SHORTAGE_LIMIT = 5;

function requireDistributor(account: AuthenticatedAccount) {
  const profile = account.distributorProfile;

  if (account.accountType !== "DISTRIBUTOR" || !profile) {
    throw new AuthorizationError("A distributor account is required.");
  }

  return profile;
}

async function branchWarehouseIds(branchId: string): Promise<string[]> {
  const branchWarehouses = await prisma.warehouse.findMany({
    where: { branchId, isActive: true },
    select: { id: true },
  });

  if (branchWarehouses.length > 0) {
    return branchWarehouses.map((warehouse) => warehouse.id);
  }

  const fallback = await prisma.warehouse.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { code: "asc" },
  });

  return fallback ? [fallback.id] : [];
}

async function salesBlock(where: Prisma.OrderWhereInput): Promise<PosSalesBlock> {
  const [orders, items] = await Promise.all([
    prisma.order.aggregate({ where, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
  ]);

  return {
    orders: orders._count._all,
    items: items._sum.quantity ?? 0,
    total: (orders._sum.totalAmount ?? new Prisma.Decimal(0)).toString(),
  };
}

/**
 * Point-of-sale dashboard for the signed-in distributor: his own sales for today
 * and the current month, plus the branch stock picture (remaining units,
 * shortages and what sells most in the branch).
 */
export async function getDistributorDashboard(
  account: AuthenticatedAccount,
): Promise<PosDashboardView> {
  const profile = requireDistributor(account);
  const timeZone = account.timezone || "Asia/Riyadh";

  return withDatabaseError(async () => {
    const branch = await prisma.branch.findUniqueOrThrow({
      where: { id: profile.branchId },
      select: { id: true, code: true, name: true },
    });

    const warehouseIds = await branchWarehouseIds(branch.id);

    const ownSalesWhere: Prisma.OrderWhereInput = {
      channel: OrderChannel.POS,
      soldByAccountId: account.id,
      status: { notIn: [OrderStatus.CANCELLED] },
    };

    const [salesToday, salesThisMonth] = await Promise.all([
      salesBlock({ ...ownSalesWhere, createdAt: { gte: startOfDayInTimeZone(timeZone) } }),
      salesBlock({ ...ownSalesWhere, createdAt: { gte: startOfMonthInTimeZone(timeZone) } }),
    ]);

    const inventoryRows = warehouseIds.length
      ? await prisma.inventoryItem.findMany({
          where: { warehouseId: { in: warehouseIds } },
          select: {
            variantId: true,
            quantityOnHand: true,
            quantityReserved: true,
            variant: {
              select: {
                sku: true,
                status: true,
                product: { select: { name: true, status: true, deletedAt: true } },
              },
            },
          },
        })
      : [];

    const perVariant = new Map<
      string,
      { sku: string; productName: string; available: number; onHand: number }
    >();

    for (const row of inventoryRows) {
      if (row.variant.status !== ProductStatus.ACTIVE) continue;
      if (row.variant.product.status !== ProductStatus.ACTIVE || row.variant.product.deletedAt !== null) {
        continue;
      }

      const current = perVariant.get(row.variantId) ?? {
        sku: row.variant.sku,
        productName: row.variant.product.name,
        available: 0,
        onHand: 0,
      };

      current.available += row.quantityOnHand - row.quantityReserved;
      current.onHand += row.quantityOnHand;
      perVariant.set(row.variantId, current);
    }

    const stock: PosStockBlock = {
      trackedItems: perVariant.size,
      totalOnHand: [...perVariant.values()].reduce((sum, entry) => sum + entry.onHand, 0),
      totalAvailable: [...perVariant.values()].reduce((sum, entry) => sum + entry.available, 0),
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    const shortages: PosShortageRow[] = [];

    for (const [variantId, entry] of perVariant) {
      const level = stockLevel(entry.available);

      if (level === "OUT_OF_STOCK") stock.outOfStockCount += 1;
      if (level === "LOW_STOCK") stock.lowStockCount += 1;

      if (level !== "IN_STOCK") {
        shortages.push({
          variantId,
          sku: entry.sku,
          productName: entry.productName,
          availableQuantity: entry.available,
        });
      }
    }

    shortages.sort((left, right) => left.availableQuantity - right.availableQuantity);

    const windowStart = new Date(Date.now() - TOP_SELLER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const grouped = await prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: {
          channel: OrderChannel.POS,
          branchId: branch.id,
          status: { notIn: [OrderStatus.CANCELLED] },
          createdAt: { gte: windowStart },
        },
      },
      _sum: { quantity: true, unitPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: TOP_SELLER_LIMIT,
    });

    const variants = grouped.length
      ? await prisma.productVariant.findMany({
          where: { id: { in: grouped.map((row) => row.variantId) } },
          select: { id: true, sku: true, product: { select: { name: true } } },
        })
      : [];

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    const topSellers: PosTopSellerRow[] = grouped.flatMap((row) => {
      const variant = variantById.get(row.variantId);

      if (!variant) {
        return [];
      }

      const quantity = row._sum.quantity ?? 0;
      const unitPrice = row._sum.unitPrice ?? new Prisma.Decimal(0);

      return [
        {
          variantId: row.variantId,
          sku: variant.sku,
          productName: variant.product.name,
          quantity,
          revenue: unitPrice.mul(quantity).toString(),
        },
      ];
    });

    return {
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name,
      timezone: timeZone,
      salesToday,
      salesThisMonth,
      stock,
      shortages: shortages.slice(0, SHORTAGE_LIMIT),
      topSellers,
    };
  });
}
