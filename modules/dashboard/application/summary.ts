import "server-only";

import { OrderStatus, PaymentStatus, Prisma, ProductStatus } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type {
  DashboardOperationsView,
  DashboardSummary,
} from "@/modules/dashboard/types";
import { getInventorySummary } from "@/modules/inventory/application/inventory";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const RECENT_ORDER_LIMIT = 5;
const LOW_STOCK_THRESHOLD = 10;

const PENDING_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PENDING_PAYMENT,
];

const IN_PROGRESS_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_TO_SHIP,
  OrderStatus.SHIPPED,
];

/**
 * Operational overview for staff. Every number is a server-side count of an
 * existing model; blocks the viewer has no permission for are returned as null
 * and never queried.
 */
export async function getDashboardOperations(
  permissions: ReadonlySet<string>,
): Promise<DashboardOperationsView> {
  const canViewOrders = permissions.has(PERMISSIONS.ORDERS_VIEW);
  const canViewPayments = permissions.has(PERMISSIONS.PAYMENTS_VIEW);
  const canViewInventory = permissions.has(PERMISSIONS.INVENTORY_VIEW);
  const canViewCustomers = permissions.has(PERMISSIONS.CUSTOMERS_VIEW);

  return withDatabaseError(async () => {
    const [orderStatusCounts, paymentStatusCounts, inventory, customerCount] = await Promise.all([
      canViewOrders
        ? prisma.order.groupBy({ by: ["status"], _count: { _all: true } })
        : Promise.resolve(null),
      canViewPayments
        ? prisma.payment.groupBy({ by: ["status"], _count: { _all: true } })
        : Promise.resolve(null),
      canViewInventory ? getInventorySummary() : Promise.resolve(null),
      canViewCustomers ? prisma.customerProfile.count() : Promise.resolve(null),
    ]);

    const orderCount = (status: OrderStatus) =>
      orderStatusCounts?.find((entry) => entry.status === status)?._count._all ?? 0;
    const paymentCount = (status: PaymentStatus) =>
      paymentStatusCounts?.find((entry) => entry.status === status)?._count._all ?? 0;

    return {
      orders: orderStatusCounts
        ? {
            total: orderStatusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
            pending: orderCount(OrderStatus.DRAFT) + orderCount(OrderStatus.PENDING_PAYMENT),
            inProgress: IN_PROGRESS_STATUSES.reduce((sum, status) => sum + orderCount(status), 0),
            delivered: orderCount(OrderStatus.DELIVERED),
            cancelled: orderCount(OrderStatus.CANCELLED),
          }
        : null,
      payments: paymentStatusCounts
        ? {
            total: paymentStatusCounts.reduce((sum, entry) => sum + entry._count._all, 0),
            pending: paymentCount(PaymentStatus.PENDING),
            approved: paymentCount(PaymentStatus.APPROVED),
            rejected: paymentCount(PaymentStatus.REJECTED),
          }
        : null,
      inventory,
      customers: customerCount === null ? null : { total: customerCount },
    };
  });
}

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
