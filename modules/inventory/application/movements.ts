import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { recordMovement } from "@/modules/inventory/application/ledger";
import { ReservationConflictError } from "@/modules/inventory/application/reservations";
import type { AdjustmentResultView, StockMovementView } from "@/modules/inventory/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_ADJUSTMENT = 100000;
const MAX_REASON = 200;

export type AdjustmentInput = {
  variantId: string;
  quantityChange: number;
  reason?: string;
  warehouseId?: string;
};

/** Validates a manual stock adjustment payload. Unknown keys are rejected. */
export function parseAdjustmentInput(payload: unknown): AdjustmentInput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const allowed = ["variantId", "quantityChange", "reason", "warehouseId"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (typeof body.variantId !== "string" || !isUuid(body.variantId)) {
    throw new ValidationError("variantId must be a variant id.");
  }

  const quantityChange = body.quantityChange;

  if (typeof quantityChange !== "number" || !Number.isInteger(quantityChange) || quantityChange === 0) {
    throw new ValidationError("quantityChange must be a non-zero whole number.");
  }

  if (Math.abs(quantityChange) > MAX_ADJUSTMENT) {
    throw new ValidationError(`quantityChange must be at most ${MAX_ADJUSTMENT} in absolute value.`);
  }

  const input: AdjustmentInput = { variantId: body.variantId, quantityChange };

  if (body.reason !== undefined) {
    if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
      throw new ValidationError("reason must be a non-empty string when provided.");
    }

    const reason = body.reason.trim();

    if (reason.length > MAX_REASON) {
      throw new ValidationError(`reason must be at most ${MAX_REASON} characters.`);
    }

    input.reason = reason;
  }

  if (body.warehouseId !== undefined) {
    if (typeof body.warehouseId !== "string" || !isUuid(body.warehouseId)) {
      throw new ValidationError("warehouseId must be a warehouse id.");
    }

    input.warehouseId = body.warehouseId;
  }

  return input;
}

async function resolveWarehouseId(warehouseId?: string): Promise<string> {
  if (warehouseId) {
    const warehouse = await withDatabaseError(() =>
      prisma.warehouse.findFirst({ where: { id: warehouseId, isActive: true }, select: { id: true } }),
    );

    if (!warehouse) {
      throw new NotFoundError("Warehouse not found.");
    }

    return warehouse.id;
  }

  const warehouse = await withDatabaseError(() =>
    prisma.warehouse.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { code: "asc" },
    }),
  );

  if (!warehouse) {
    throw new NotFoundError("No active warehouse is configured.");
  }

  return warehouse.id;
}

const itemSelection = {
  id: true,
  variantId: true,
  warehouseId: true,
  quantityOnHand: true,
  quantityReserved: true,
  variant: { select: { sku: true } },
  warehouse: { select: { code: true } },
} as const;

/**
 * Applies a manual stock correction with permission `inventory.adjust` and
 * appends the matching ledger row in the same transaction. On-hand stock can
 * never be reduced below the quantity that is currently reserved.
 */
export async function adjustStock(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<AdjustmentResultView> {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);

  const input = parseAdjustmentInput(payload);
  const warehouseId = await resolveWarehouseId(input.warehouseId);

  const runAdjustment = () =>
    prisma.$transaction(async (transaction) => {
      let item = await transaction.inventoryItem.findUnique({
        where: { variantId_warehouseId: { variantId: input.variantId, warehouseId } },
        select: itemSelection,
      });

      if (!item) {
        const variant = await transaction.productVariant.findUnique({
          where: { id: input.variantId },
          select: { id: true },
        });

        if (!variant) {
          throw new NotFoundError("Variant not found.");
        }

        item = await transaction.inventoryItem.create({
          data: { variantId: input.variantId, warehouseId, quantityOnHand: 0, quantityReserved: 0 },
          select: itemSelection,
        });
      }

      const newOnHand = item.quantityOnHand + input.quantityChange;

      if (newOnHand < item.quantityReserved) {
        throw new ConflictError(
          "The adjustment would leave less on-hand stock than the quantity currently reserved.",
        );
      }

      const result = await transaction.inventoryItem.updateMany({
        where: { id: item.id, quantityOnHand: item.quantityOnHand },
        data: { quantityOnHand: newOnHand },
      });

      if (result.count === 0) {
        throw new ReservationConflictError("Stock state changed concurrently.");
      }

      await recordMovement(transaction, {
        variantId: input.variantId,
        warehouseId,
        type: "ADJUSTMENT",
        quantityChange: input.quantityChange,
        quantityOnHandAfter: newOnHand,
        quantityReservedAfter: item.quantityReserved,
        context: { actorAccountId: account.id, reason: input.reason },
      });

      return {
        variantId: item.variantId,
        sku: item.variant.sku,
        warehouseId: item.warehouseId,
        warehouseCode: item.warehouse.code,
        quantityOnHand: newOnHand,
        quantityReserved: item.quantityReserved,
        availableQuantity: newOnHand - item.quantityReserved,
      };
    });

  return withDatabaseError(async () => {
    try {
      return await runAdjustment();
    } catch (error) {
      if (error instanceof ReservationConflictError) {
        // One retry covers a concurrent reservation that moved the counters.
        return runAdjustment();
      }

      throw error;
    }
  });
}

const movementSelection = {
  id: true,
  variantId: true,
  warehouseId: true,
  type: true,
  quantityChange: true,
  quantityOnHandAfter: true,
  quantityReservedAfter: true,
  reason: true,
  orderId: true,
  actorAccountId: true,
  createdAt: true,
  variant: { select: { sku: true } },
  warehouse: { select: { code: true } },
} satisfies Prisma.StockMovementSelect;

type MovementRecord = Prisma.StockMovementGetPayload<{ select: typeof movementSelection }>;

export type StockMovementFilters = { variantId?: string };

export type StockMovementPage = {
  movements: StockMovementView[];
  pagination: { limit: number; offset: number; total: number };
};

export function parseMovementFilters(searchParams: URLSearchParams): StockMovementFilters {
  const filters: StockMovementFilters = {};
  const variantId = searchParams.get("variantId");

  if (variantId !== null) {
    if (!isUuid(variantId)) {
      throw new ValidationError("variantId must be a variant id.");
    }

    filters.variantId = variantId;
  }

  return filters;
}

/** Staff read of the ledger. Requires inventory.view. */
export async function listStockMovements(
  account: AuthenticatedAccount,
  pagination: Pagination,
  filters: StockMovementFilters = {},
): Promise<StockMovementPage> {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  const where: Prisma.StockMovementWhereInput = filters.variantId
    ? { variantId: filters.variantId }
    : {};

  return withDatabaseError(async () => {
    const [records, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        select: movementSelection,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    const movements: StockMovementView[] = records.map((record: MovementRecord) => ({
      id: record.id,
      variantId: record.variantId,
      sku: record.variant.sku,
      warehouseId: record.warehouseId,
      warehouseCode: record.warehouse.code,
      type: record.type,
      quantityChange: record.quantityChange,
      quantityOnHandAfter: record.quantityOnHandAfter,
      quantityReservedAfter: record.quantityReservedAfter,
      reason: record.reason,
      orderId: record.orderId,
      actorAccountId: record.actorAccountId,
      createdAt: record.createdAt.toISOString(),
    }));

    return {
      movements,
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}
