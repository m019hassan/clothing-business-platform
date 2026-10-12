import "server-only";

import { NotificationType } from "@prisma/client";

import { listBranchPermissionHolders } from "@/modules/notification/application/branch-notifications";
import { createNotification } from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";
import { stockLevel } from "@/src/lib/inventory/stock-level";

export type LowStockSweepResult = {
  branchesChecked: number;
  lowVariants: number;
  notificationsCreated: number;
};

/**
 * Daily sweep: finds variants running low in each branch and notifies the
 * branch accounts holding `inventory.view`. While an account still has an
 * unread alert for the same variant, the sweep skips it, so repeated runs
 * cannot fill the bell with duplicates. Alerts go out per variant.
 */
export async function runLowStockSweep(
  options: { branchIds?: string[] } = {},
): Promise<LowStockSweepResult> {
  const branches = await withDatabaseError(() =>
    prisma.branch.findMany({
      where: {
        isActive: true,
        ...(options.branchIds && options.branchIds.length > 0
          ? { id: { in: options.branchIds } }
          : {}),
      },
      select: { id: true, code: true, warehouses: { where: { isActive: true }, select: { id: true } } },
    }),
  );

  let lowVariants = 0;
  let notificationsCreated = 0;

  for (const branch of branches) {
    const warehouseIds = branch.warehouses.map((warehouse) => warehouse.id);

    if (warehouseIds.length === 0) {
      continue;
    }

    const balances = await withDatabaseError(() =>
      prisma.inventoryItem.findMany({
        where: { warehouseId: { in: warehouseIds } },
        select: {
          variantId: true,
          quantityOnHand: true,
          quantityReserved: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      }),
    );

    const perVariant = new Map<string, { sku: string; productName: string; available: number }>();

    for (const balance of balances) {
      const entry = perVariant.get(balance.variantId) ?? {
        sku: balance.variant.sku,
        productName: balance.variant.product.name,
        available: 0,
      };

      entry.available += balance.quantityOnHand - balance.quantityReserved;
      perVariant.set(balance.variantId, entry);
    }

    const runningLow = [...perVariant.entries()].filter(
      ([, entry]) => stockLevel(entry.available) !== "IN_STOCK",
    );

    if (runningLow.length === 0) {
      continue;
    }

    lowVariants += runningLow.length;

    await withDatabaseError(() =>
      prisma.$transaction(async (transaction) => {
        const recipients = await listBranchPermissionHolders(transaction, {
          branchId: branch.id,
          permission: "inventory.view",
        });

        for (const accountId of recipients) {
          for (const [variantId, entry] of runningLow) {
            const existing = await transaction.notification.findFirst({
              where: {
                accountId,
                type: NotificationType.INVENTORY,
                entityType: "ProductVariant",
                entityId: variantId,
                readAt: null,
              },
              select: { id: true },
            });

            if (existing) {
              continue;
            }

            await createNotification(transaction, {
              accountId,
              type: NotificationType.INVENTORY,
              title: `نقص مخزون في ${branch.code}: ${entry.productName}`,
              body:
                entry.available <= 0
                  ? `${entry.sku} نافد — يحتاج توريد.`
                  : `${entry.sku} — المتبقي ${entry.available} فقط.`,
              entityType: "ProductVariant",
              entityId: variantId,
            });
            notificationsCreated += 1;
          }
        }
      }),
    );
  }

  return { branchesChecked: branches.length, lowVariants, notificationsCreated };
}
