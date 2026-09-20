import "server-only";

import { OrderStatus, Prisma, ProductStatus } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { DashboardSummary } from "@/modules/dashboard/types";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const RECENT_ORDER_LIMIT = 5;
const LOW_STOCK_THRESHOLD = 10;

const PENDING_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PENDING_PAYMENT,
];

export async function getDashboardSummary(
  account: AuthenticatedAccount,
): Promise<DashboardSummary> {
  const customerProfile = account.customerProfile;
  const customerScoped = customerProfile !== null;

  const orderWhere: Prisma.OrderWhereInput = customerScoped
    ? { customerProfileId: customerProfile.id }
    : {};

  return withDatabaseError(async () => {
    const [orderCount, pendingOrderCount, productCount, inventoryBalances, recentOrders] =
      await Promise.all([
        prisma.order.count({ where: orderWhere }),
        prisma.order.count({
          where: { ...orderWhere, status: { in: PENDING_STATUSES } },
        }),
        prisma.product.count({
          where: { status: ProductStatus.ACTIVE, deletedAt: null },
        }),
        prisma.inventoryItem.groupBy({
          by: ["variantId"],
          _sum: { quantityOnHand: true, quantityReserved: true },
        }),
        prisma.order.findMany({
          where: orderWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: RECENT_ORDER_LIMIT,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        }),
      ]);

    // Business rule (business-rules.md): low stock is triggered below 10 available units.
    const lowStockCount = inventoryBalances.filter((balance) => {
      const onHand = balance._sum.quantityOnHand ?? 0;
      const reserved = balance._sum.quantityReserved ?? 0;

      return onHand - reserved < LOW_STOCK_THRESHOLD;
    }).length;

    return {
      scope: customerScoped ? "customer" : "business",
      orderCount,
      pendingOrderCount,
      productCount,
      lowStockCount,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount.toString(),
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  });
}
