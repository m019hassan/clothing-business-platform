import "server-only";

import { GLOBAL_BRANCH_SCOPE, type BranchScope } from "@/modules/branches/application/scope";

import { Prisma } from "@prisma/client";

import type {
  InventoryPageView,
  InventoryRowView,
  InventorySummaryView,
} from "@/modules/inventory/types";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";
import { stockLevel } from "@/src/lib/inventory/stock-level";
import type { Pagination } from "@/src/lib/validation";

const inventorySelection = {
  id: true,
  quantityOnHand: true,
  quantityReserved: true,
  updatedAt: true,
  warehouseId: true,
  warehouse: { select: { name: true, code: true } },
  variant: {
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      status: true,
      product: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.InventoryItemSelect;

type InventoryRecord = Prisma.InventoryItemGetPayload<{ select: typeof inventorySelection }>;

function mapRow(row: InventoryRecord): InventoryRowView {
  return {
    id: row.id,
    variantId: row.variant.id,
    sku: row.variant.sku,
    size: row.variant.size,
    color: row.variant.color,
    variantStatus: row.variant.status,
    productId: row.variant.product.id,
    productName: row.variant.product.name,
    warehouseName: row.warehouse.name,
    warehouseId: row.warehouseId,
    warehouseCode: row.warehouse.code,
    quantityOnHand: row.quantityOnHand,
    quantityReserved: row.quantityReserved,
    availableQuantity: row.quantityOnHand - row.quantityReserved,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Read-only inventory overview for authorized staff.
 * There is no inventory API yet, so this reads the existing counters directly.
 * All quantities are backend values; the frontend never recalculates stock rules
 * beyond the documented available = on-hand - reserved definition.
 */
/** Branch scoping: an unscoped account sees every warehouse. */
function scopeWhere(scope: BranchScope): Prisma.InventoryItemWhereInput {
  return scope.warehouseIds === null ? {} : { warehouseId: { in: scope.warehouseIds } };
}

export async function getInventorySummary(scope: BranchScope = GLOBAL_BRANCH_SCOPE): Promise<InventorySummaryView> {
  return withDatabaseError(async () => {
    const where = scopeWhere(scope);

    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        select: { quantityOnHand: true, quantityReserved: true },
      }),
    ]);

    const totals = items.reduce(
      (accumulator, item) => ({
        onHand: accumulator.onHand + item.quantityOnHand,
        reserved: accumulator.reserved + item.quantityReserved,
        low:
          accumulator.low +
          (stockLevel(item.quantityOnHand - item.quantityReserved) === "LOW_STOCK" ? 1 : 0),
        out:
          accumulator.out +
          (stockLevel(item.quantityOnHand - item.quantityReserved) === "OUT_OF_STOCK" ? 1 : 0),
      }),
      { onHand: 0, reserved: 0, low: 0, out: 0 },
    );

    return {
      trackedRows: total,
      totalOnHand: totals.onHand,
      totalReserved: totals.reserved,
      totalAvailable: totals.onHand - totals.reserved,
      lowStockRows: totals.low,
      outOfStockRows: totals.out,
    };
  });
}

export async function getInventoryPage(
  pagination: Pagination,
  scope: BranchScope = GLOBAL_BRANCH_SCOPE,
): Promise<InventoryPageView> {
  return withDatabaseError(async () => {
    const where = scopeWhere(scope);

    const [records, total, summary] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        select: inventorySelection,
        orderBy: [
          { variant: { product: { name: "asc" } } },
          { variant: { sku: "asc" } },
          { warehouse: { code: "asc" } },
        ],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.inventoryItem.count({ where }),
      getInventorySummary(scope),
    ]);

    return {
      rows: records.map(mapRow),
      summary,
      pagination: {
        limit: pagination.limit,
        offset: pagination.offset,
        total,
      },
    };
  });
}
