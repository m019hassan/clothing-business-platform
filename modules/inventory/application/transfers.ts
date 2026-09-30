import "server-only";

import { Prisma, type Warehouse } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { recordMovement } from "@/modules/inventory/application/ledger";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { prisma } from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid, normalizeDigits } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type TransferTarget = {
  branchId: string;
  branchCode: string;
  branchName: string;
  warehouseCode: string | null;
  warehouseName: string | null;
};

export type TransferResult = {
  variantId: string;
  quantity: number;
  fromWarehouseName: string;
  toBranchName: string;
  toWarehouseName: string;
};

const MAX_TRANSFER = 1_000_000;

/** Active branches a transfer can land in, with the warehouse serving each. */
export async function listTransferTargets(): Promise<TransferTarget[]> {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      warehouses: { where: { isActive: true }, orderBy: { code: "asc" }, select: { code: true, name: true } },
    },
  });

  return branches.map((branch) => ({
    branchId: branch.id,
    branchCode: branch.code,
    branchName: branch.name,
    warehouseCode: branch.warehouses[0]?.code ?? null,
    warehouseName: branch.warehouses[0]?.name ?? null,
  }));
}

/** A branch's stocking warehouse, created on first use so a branch can always receive. */
async function ensureBranchWarehouse(
  transaction: Prisma.TransactionClient,
  branch: { id: string; code: string; name: string },
): Promise<Warehouse> {
  const existing = await transaction.warehouse.findFirst({
    where: { branchId: branch.id, isActive: true },
    orderBy: { code: "asc" },
  });

  if (existing) {
    return existing;
  }

  return transaction.warehouse.create({
    data: {
      code: `${branch.code}-WH`.slice(0, 30),
      name: `مستودع ${branch.name}`.slice(0, 100),
      branchId: branch.id,
      isActive: true,
    },
  });
}

/**
 * Moves stock between warehouses: the source loses the units and the destination branch
 * gains them, both through the ledger (a negative and a positive TRANSFER movement), so
 * the story stays complete. The source must hold enough unreserved units.
 */
export async function transferStock(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<TransferResult> {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter(
    (key) => key !== "variantId" && key !== "fromWarehouseId" && key !== "toBranchId" && key !== "quantity" && key !== "note",
  );

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const variantId = typeof body.variantId === "string" ? body.variantId : "";
  const fromWarehouseId = typeof body.fromWarehouseId === "string" ? body.fromWarehouseId : "";
  const toBranchId = typeof body.toBranchId === "string" ? body.toBranchId : "";
  const note = typeof body.note === "string" && body.note.trim() !== "" ? body.note.trim().slice(0, 200) : null;
  const quantity =
    typeof body.quantity === "number" ? body.quantity : Number(normalizeDigits(String(body.quantity ?? "")));

  if (!isUuid(variantId)) {
    throw new ValidationError("A variant is required.");
  }

  if (!isUuid(fromWarehouseId)) {
    throw new ValidationError("A source warehouse is required.");
  }

  if (!isUuid(toBranchId)) {
    throw new ValidationError("A destination branch is required.");
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TRANSFER) {
    throw new ValidationError("The quantity must be a whole number between 1 and 1000000.");
  }

  const scope = await resolveBranchScope(account);
  const scopeIds = scope.warehouseIds;

  const fromWarehouse = await prisma.warehouse.findUnique({
    where: { id: fromWarehouseId },
    select: { id: true, name: true, code: true, branchId: true, isActive: true },
  });

  if (!fromWarehouse || !fromWarehouse.isActive) {
    throw new NotFoundError("The source warehouse was not found.");
  }

  if (scopeIds !== null && !scopeIds.includes(fromWarehouse.id)) {
    throw new NotFoundError("The source warehouse was not found.");
  }

  if (toBranchId === fromWarehouse.branchId) {
    throw new ConflictError("The stock is already in this branch.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, sku: true, product: { select: { name: true, status: true, deletedAt: true } } },
      });

      if (!variant || variant.product.status !== "ACTIVE" || variant.product.deletedAt !== null) {
        throw new NotFoundError("The variant was not found.");
      }

      const branch = await transaction.branch.findUnique({
        where: { id: toBranchId },
        select: { id: true, code: true, name: true, isActive: true },
      });

      if (!branch || !branch.isActive) {
        throw new NotFoundError("The destination branch was not found.");
      }

      // The source has to be inside the caller's scope; the destination may be any active
      // branch, because moving stock out of the warehouse is exactly what the scope
      // holds: a factory user sends to the shops.
      const destination = await ensureBranchWarehouse(transaction, branch);

      const source = await transaction.inventoryItem.findUnique({
        where: { variantId_warehouseId: { variantId, warehouseId: fromWarehouse.id } },
        select: { id: true, quantityOnHand: true, quantityReserved: true },
      });

      if (!source || source.quantityOnHand - source.quantityReserved < quantity) {
        const available = source ? source.quantityOnHand - source.quantityReserved : 0;

        throw new ConflictError(`Only ${available} unit(s) can be moved from ${fromWarehouse.name}.`);
      }

      const sourceUpdate = await transaction.inventoryItem.updateMany({
        where: { id: source.id, quantityOnHand: source.quantityOnHand, quantityReserved: source.quantityReserved },
        data: { quantityOnHand: source.quantityOnHand - quantity },
      });

      if (sourceUpdate.count === 0) {
        throw new ConflictError("The stock changed while moving; try again.");
      }

      const destinationItem = await transaction.inventoryItem.findUnique({
        where: { variantId_warehouseId: { variantId, warehouseId: destination.id } },
        select: { id: true, quantityOnHand: true, quantityReserved: true },
      });

      const destinationAfter = (destinationItem?.quantityOnHand ?? 0) + quantity;

      await transaction.inventoryItem.upsert({
        where: { variantId_warehouseId: { variantId, warehouseId: destination.id } },
        create: { variantId, warehouseId: destination.id, quantityOnHand: quantity, quantityReserved: 0 },
        update: { quantityOnHand: destinationAfter },
      });

      const context = {
        actorAccountId: account.id,
        reason: note ?? `Transfer to ${branch.name}`,
      };

      await recordMovement(transaction, {
        variantId,
        warehouseId: fromWarehouse.id,
        type: "TRANSFER",
        quantityChange: -quantity,
        quantityOnHandAfter: source.quantityOnHand - quantity,
        quantityReservedAfter: source.quantityReserved,
        context,
      });

      await recordMovement(transaction, {
        variantId,
        warehouseId: destination.id,
        type: "TRANSFER",
        quantityChange: quantity,
        quantityOnHandAfter: destinationAfter,
        quantityReservedAfter: destinationItem?.quantityReserved ?? 0,
        context: { actorAccountId: account.id, reason: note ?? `Transfer from ${fromWarehouse.name}` },
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "STOCK_TRANSFERRED",
          entity: "ProductVariant",
          entityId: variantId,
          oldValue: `${fromWarehouse.name}`,
          newValue: `${quantity} × ${variant.sku} → ${branch.name}`,
        },
      });

      return {
        variantId,
        quantity,
        fromWarehouseName: fromWarehouse.name,
        toBranchName: branch.name,
        toWarehouseName: destination.name,
      };
    }),
  );
}
