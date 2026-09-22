import "server-only";

import { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus, Prisma, ProductStatus } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { sellStock } from "@/modules/inventory/application/reservations";
import type { PosCatalogView, PosReceiptView } from "@/modules/pos/types";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_LINES = 20;
const MAX_LINE_QUANTITY = 999;
const WALK_IN_PASSWORD_SENTINEL = "walkin-no-login";
const WALK_IN_PHONE_PREFIX = "WALKIN-";

export type PosSaleInput = {
  items: { variantId: string; quantity: number }[];
};

/** Validates a point-of-sale payload. Unknown keys are rejected. */
export function parsePosSaleInput(payload: unknown): PosSaleInput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => key !== "items");

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ValidationError("items must be a non-empty array.");
  }

  if (body.items.length > MAX_LINES) {
    throw new ValidationError(`A sale can contain at most ${MAX_LINES} lines.`);
  }

  const items = body.items.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ValidationError("Each item must be an object with variantId and quantity.");
    }

    const line = entry as Record<string, unknown>;

    if (typeof line.variantId !== "string" || !isUuid(line.variantId)) {
      throw new ValidationError("Each item needs a valid variantId.");
    }

    if (
      typeof line.quantity !== "number" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_LINE_QUANTITY
    ) {
      throw new ValidationError(`Each item quantity must be a whole number between 1 and ${MAX_LINE_QUANTITY}.`);
    }

    return { variantId: line.variantId, quantity: line.quantity };
  });

  // Merge repeated lines of the same variant so stock and totals stay consistent.
  const merged = new Map<string, number>();

  for (const item of items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }

  return { items: [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity })) };
}

type DistributorContext = { distributorId: string; branchId: string; displayName: string };

function requireDistributor(account: AuthenticatedAccount): DistributorContext {
  const profile = account.distributorProfile;

  if (account.accountType !== "DISTRIBUTOR" || !profile) {
    throw new AuthorizationError("A distributor account is required for point-of-sale sales.");
  }

  return {
    distributorId: profile.id,
    branchId: profile.branchId,
    displayName: account.email ?? profile.distributorCode,
  };
}

/** The branch's warehouses; branches without their own use the central one. */
async function resolveWarehouseIds(branchId: string): Promise<string[]> {
  const branchWarehouses = await withDatabaseError(() =>
    prisma.warehouse.findMany({ where: { branchId, isActive: true }, select: { id: true } }),
  );

  if (branchWarehouses.length > 0) {
    return branchWarehouses.map((warehouse) => warehouse.id);
  }

  const fallback = await withDatabaseError(() =>
    prisma.warehouse.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { code: "asc" },
    }),
  );

  if (!fallback) {
    throw new NotFoundError("No active warehouse is configured.");
  }

  return [fallback.id];
}

/** Walk-in customer used as the buyer of point-of-sale orders (one per branch). */
async function ensureWalkInProfile(
  transaction: Prisma.TransactionClient,
  branch: { id: string; code: string; name: string },
): Promise<string> {
  const existing = await transaction.customerProfile.findFirst({
    where: { branchId: branch.id, isWalkIn: true },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const classification = await transaction.customerClassification.upsert({
    where: { code: "RETAIL" },
    create: { code: "RETAIL", name: "Retail" },
    update: {},
    select: { id: true },
  });

  const account = await transaction.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: null,
      // Account.phone is VarChar(20) and unique: a short deterministic value
      // derived from the branch keeps one walk-in buyer per branch.
      phone: `${WALK_IN_PHONE_PREFIX}${branch.id.replaceAll("-", "").slice(0, 8)}`,
      passwordHash: WALK_IN_PASSWORD_SENTINEL,
    },
    select: { id: true },
  });

  const profile = await transaction.customerProfile.create({
    data: {
      accountId: account.id,
      customerCode: `WALKIN-${branch.code}`.slice(0, 50),
      classificationId: classification.id,
      firstName: "Walk-in",
      lastName: branch.name.slice(0, 100),
      isWalkIn: true,
      branchId: branch.id,
    },
    select: { id: true },
  });

  return profile.id;
}

/** Branch stock and prices for the point-of-sale screen. */
export async function getPosCatalog(account: AuthenticatedAccount): Promise<PosCatalogView> {
  const distributor = requireDistributor(account);
  const warehouseIds = await resolveWarehouseIds(distributor.branchId);

  const branch = await withDatabaseError(() =>
    prisma.branch.findUniqueOrThrow({
      where: { id: distributor.branchId },
      select: { id: true, code: true, name: true },
    }),
  );

  const items = await withDatabaseError(() =>
    prisma.inventoryItem.findMany({
      where: {
        warehouseId: { in: warehouseIds },
        variant: { status: ProductStatus.ACTIVE, product: { status: ProductStatus.ACTIVE, deletedAt: null } },
      },
      select: {
        variantId: true,
        quantityOnHand: true,
        quantityReserved: true,
        variant: {
          select: {
            sku: true,
            size: true,
            color: true,
            priceOverride: true,
            product: { select: { id: true, name: true, basePrice: true, currency: true } },
          },
        },
      },
      orderBy: { variant: { sku: "asc" } },
    }),
  );

  // A variant can sit in several warehouses of the branch: aggregate availability.
  const aggregated = new Map<string, PosCatalogView["items"][number]>();

  for (const item of items) {
    const current = aggregated.get(item.variantId);
    const available = item.quantityOnHand - item.quantityReserved;

    if (current) {
      current.availableQuantity += available;
      continue;
    }

    aggregated.set(item.variantId, {
      variantId: item.variantId,
      sku: item.variant.sku,
      size: item.variant.size,
      color: item.variant.color,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      unitPrice: (item.variant.priceOverride ?? item.variant.product.basePrice).toString(),
      currency: item.variant.product.currency,
      availableQuantity: available,
    });
  }

  return {
    branchId: branch.id,
    branchCode: branch.code,
    branchName: branch.name,
    items: [...aggregated.values()],
  };
}

/**
 * Completes a counter sale: the order is confirmed immediately with an approved
 * cash payment and the branch stock is decremented in the same transaction.
 */
export async function createPosSale(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<PosReceiptView> {
  const distributor = requireDistributor(account);
  const input = parsePosSaleInput(payload);
  const warehouseIds = await resolveWarehouseIds(distributor.branchId);

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const branch = await transaction.branch.findUniqueOrThrow({
        where: { id: distributor.branchId },
        select: { id: true, code: true, name: true },
      });

      const lines: PosReceiptView["lines"] = [];
      let total = new Prisma.Decimal(0);
      let currency = "SAR";

      for (const item of input.items) {
        const variant = await transaction.productVariant.findFirst({
          where: { id: item.variantId, status: ProductStatus.ACTIVE },
          select: {
            id: true,
            sku: true,
            priceOverride: true,
            product: { select: { name: true, basePrice: true, currency: true, status: true, deletedAt: true } },
          },
        });

        if (!variant || variant.product.status !== ProductStatus.ACTIVE || variant.product.deletedAt !== null) {
          throw new NotFoundError("One of the products is no longer available.");
        }

        const unitPrice = variant.priceOverride ?? variant.product.basePrice;
        const lineTotal = unitPrice.mul(item.quantity);
        currency = variant.product.currency;

        try {
          await sellStock(transaction, item.variantId, item.quantity, {
            warehouseIds,
            context: {
              actorAccountId: account.id,
              reason: `POS sale at ${branch.code}`,
            },
          });
        } catch (error) {
          if (error instanceof ConflictError) {
            throw new ConflictError(`Insufficient stock for ${variant.sku}.`);
          }

          throw error;
        }

        total = total.add(lineTotal);

        lines.push({
          variantId: variant.id,
          sku: variant.sku,
          productName: variant.product.name,
          quantity: item.quantity,
          unitPrice: unitPrice.toString(),
          lineTotal: lineTotal.toString(),
        });
      }

      const walkInProfileId = await ensureWalkInProfile(transaction, branch);

      const order = await transaction.order.create({
        data: {
          orderNumber: `POS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
          customerProfileId: walkInProfileId,
          status: OrderStatus.CONFIRMED,
          channel: OrderChannel.POS,
          branchId: branch.id,
          soldByAccountId: account.id,
          subtotalAmount: total,
          totalAmount: total,
          currency,
          items: {
            create: input.items.map((item, index) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(lines[index].unitPrice),
              discountAmount: new Prisma.Decimal(0),
            })),
          },
          payments: {
            create: [
              {
                status: PaymentStatus.APPROVED,
                method: PaymentMethod.CASH,
                amount: total,
                currency,
              },
            ],
          },
        },
        select: { id: true, orderNumber: true, status: true, createdAt: true },
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "POS_SALE",
          entity: "Order",
          entityId: order.id,
          newValue: `${total.toString()} ${currency}`,
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        currency,
        totalAmount: total.toString(),
        itemCount: input.items.reduce((sum, item) => sum + item.quantity, 0),
        branchCode: branch.code,
        soldBy: distributor.displayName,
        createdAt: order.createdAt.toISOString(),
        lines,
      };
    }),
  );
}
