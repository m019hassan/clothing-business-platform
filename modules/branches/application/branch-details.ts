import "server-only";

import { OrderChannel, OrderStatus } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { NotFoundError, withDatabaseError } from "@/src/lib/errors";
import { startOfDayInTimeZone, startOfMonthInTimeZone } from "@/src/lib/time";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type BranchSalesBlock = { orders: number; items: number; total: string };

export type BranchDetailsView = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  warehouses: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    onHand: number;
    reserved: number;
    available: number;
    trackedItems: number;
  }[];
  stock: { onHand: number; available: number; lowCount: number; outCount: number };
  sales: { today: BranchSalesBlock; month: BranchSalesBlock };
  recentSales: {
    orderId: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    total: string;
    currency: string;
  }[];
  recentMovements: {
    id: string;
    type: string;
    sku: string;
    warehouseCode: string;
    quantityChange: number;
    createdAt: string;
  }[];
  staff: { employees: number; distributors: number; customers: number };
};

const SALE_STATUSES = [OrderStatus.CONFIRMED, OrderStatus.RETURNED];
const LOW_THRESHOLD = 10;

function stockLevel(available: number): "LOW" | "OUT" | "OK" {
  if (available <= 0) {
    return "OUT";
  }

  return available < LOW_THRESHOLD ? "LOW" : "OK";
}

/** Everything about one branch: its warehouses, stock, sales, staff and recent activity. */
export async function getBranchDetails(
  account: AuthenticatedAccount,
  branchId: string,
): Promise<BranchDetailsView> {
  await requirePermission(PERMISSIONS.BRANCHES_VIEW);

  if (!isUuid(branchId)) {
    throw new NotFoundError("Branch not found.");
  }

  // A scoped employee only ever sees their own branch.
  const ownBranchId = account.employeeProfile?.branchId ?? null;

  if (ownBranchId !== null && ownBranchId !== branchId) {
    throw new NotFoundError("Branch not found.");
  }

  const timeZone = account.timezone || "Asia/Riyadh";

  return withDatabaseError(async () => {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        isActive: true,
        createdAt: true,
        warehouses: {
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true, isActive: true },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError("Branch not found.");
    }

    const warehouseIds = branch.warehouses.map((warehouse) => warehouse.id);

    const salesWhere = {
      channel: OrderChannel.POS,
      branchId: branch.id,
      status: { in: SALE_STATUSES },
    };

    const salesBlock = async (from: Date): Promise<BranchSalesBlock> => {
      const [aggregate, items] = await Promise.all([
        prisma.order.aggregate({
          where: { ...salesWhere, createdAt: { gte: from } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        prisma.orderItem.aggregate({
          where: { order: { ...salesWhere, createdAt: { gte: from } } },
          _sum: { quantity: true },
        }),
      ]);

      return {
        orders: aggregate._count._all,
        items: items._sum.quantity ?? 0,
        total: (aggregate._sum.totalAmount ?? 0).toString(),
      };
    };

    const [today, month, inventoryRows, recentSales, recentMovements, employees, distributors, customers] =
      await Promise.all([
        salesBlock(startOfDayInTimeZone(timeZone)),
        salesBlock(startOfMonthInTimeZone(timeZone)),
        warehouseIds.length
          ? prisma.inventoryItem.findMany({
              where: { warehouseId: { in: warehouseIds } },
              select: { warehouseId: true, quantityOnHand: true, quantityReserved: true },
            })
          : Promise.resolve([]),
        prisma.order.findMany({
          where: salesWhere,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            status: true,
            totalAmount: true,
            currency: true,
          },
        }),
        warehouseIds.length
          ? prisma.stockMovement.findMany({
              where: { warehouseId: { in: warehouseIds } },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 5,
              select: {
                id: true,
                type: true,
                quantityChange: true,
                createdAt: true,
                variant: { select: { sku: true } },
                warehouse: { select: { code: true } },
              },
            })
          : Promise.resolve([]),
        prisma.employeeProfile.count({ where: { branchId: branch.id } }),
        prisma.distributorProfile.count({ where: { branchId: branch.id } }),
        prisma.customerProfile.count({ where: { branchId: branch.id } }),
      ]);

    const perWarehouse = new Map<string, { onHand: number; reserved: number; trackedItems: number }>();

    for (const row of inventoryRows) {
      const entry = perWarehouse.get(row.warehouseId) ?? { onHand: 0, reserved: 0, trackedItems: 0 };
      entry.onHand += row.quantityOnHand;
      entry.reserved += row.quantityReserved;
      entry.trackedItems += 1;
      perWarehouse.set(row.warehouseId, entry);
    }

    let onHand = 0;
    let available = 0;
    let lowCount = 0;
    let outCount = 0;

    for (const row of inventoryRows) {
      const free = row.quantityOnHand - row.quantityReserved;
      onHand += row.quantityOnHand;
      available += free;

      const level = stockLevel(free);

      if (level === "LOW") {
        lowCount += 1;
      }

      if (level === "OUT") {
        outCount += 1;
      }
    }

    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      isActive: branch.isActive,
      createdAt: branch.createdAt.toISOString(),
      warehouses: branch.warehouses.map((warehouse) => {
        const entry = perWarehouse.get(warehouse.id) ?? { onHand: 0, reserved: 0, trackedItems: 0 };

        return {
          id: warehouse.id,
          code: warehouse.code,
          name: warehouse.name,
          isActive: warehouse.isActive,
          onHand: entry.onHand,
          reserved: entry.reserved,
          available: entry.onHand - entry.reserved,
          trackedItems: entry.trackedItems,
        };
      }),
      stock: { onHand, available, lowCount, outCount },
      sales: { today, month },
      recentSales: recentSales.map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        status: order.status,
        total: order.totalAmount.toFixed(2),
        currency: order.currency,
      })),
      recentMovements: recentMovements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        sku: movement.variant.sku,
        warehouseCode: movement.warehouse.code,
        quantityChange: movement.quantityChange,
        createdAt: movement.createdAt.toISOString(),
      })),
      staff: { employees, distributors, customers },
    };
  });
}
