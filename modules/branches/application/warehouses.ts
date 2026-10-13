import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type WarehouseView = {
  id: string;
  code: string;
  name: string;
  kind: "STORE" | "STORAGE";
  branchId: string | null;
  branchName: string | null;
  isActive: boolean;
  onHand: number;
  available: number;
  trackedItems: number;
};

const CODE = /^[A-Za-z0-9-]{2,30}$/;

function parseWrite(
  payload: unknown,
  partial: boolean,
): { code?: string; name?: string; branchId?: string | null; isActive?: boolean; kind?: "STORE" | "STORAGE" } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const allowed = ["code", "name", "branchId", "isActive", "kind"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: { code?: string; name?: string; branchId?: string | null; isActive?: boolean; kind?: "STORE" | "STORAGE" } = {};

  if (body.code !== undefined) {
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!CODE.test(code)) {
      throw new ValidationError("The warehouse code must be 2-30 letters, digits or dashes.");
    }

    input.code = code;
  }

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (name.length < 2 || name.length > 100) {
      throw new ValidationError("The warehouse name must be between 2 and 100 characters.");
    }

    input.name = name;
  }

  if (body.branchId !== undefined) {
    if (body.branchId === null || body.branchId === "") {
      input.branchId = null;
    } else if (typeof body.branchId === "string" && isUuid(body.branchId)) {
      input.branchId = body.branchId;
    } else {
      throw new ValidationError("branchId must be a branch id or null.");
    }
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError("isActive must be true or false.");
    }

    input.isActive = body.isActive;
  }

  if (body.kind !== undefined) {
    if (body.kind !== "STORE" && body.kind !== "STORAGE") {
      throw new ValidationError("kind must be STORE or STORAGE.");
    }

    input.kind = body.kind;
  }

  if (Object.keys(input).length === 0) {
    throw new ValidationError(partial ? "Nothing to update." : "code and name are required.");
  }

  if (!partial && (input.code === undefined || input.name === undefined)) {
    throw new ValidationError("code and name are required.");
  }

  return input;
}

async function assertBranch(branchId: string | null | undefined): Promise<void> {
  if (!branchId) {
    return;
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });

  if (!branch) {
    throw new NotFoundError("The branch was not found.");
  }
}

/** Every warehouse with its branch and how much stock it holds. */
export async function listWarehouses(kind?: "STORE" | "STORAGE"): Promise<WarehouseView[]> {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  return withDatabaseError(async () => {
    const warehouses = await prisma.warehouse.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        kind: true,
        branchId: true,
        isActive: true,
        branch: { select: { name: true } },
        inventoryItems: { select: { quantityOnHand: true, quantityReserved: true } },
      },
    });

    return warehouses.map((warehouse) => {
      let onHand = 0;
      let available = 0;

      for (const row of warehouse.inventoryItems) {
        onHand += row.quantityOnHand;
        available += row.quantityOnHand - row.quantityReserved;
      }

      return {
        id: warehouse.id,
        code: warehouse.code,
        name: warehouse.name,
        kind: warehouse.kind,
        branchId: warehouse.branchId,
        branchName: warehouse.branch?.name ?? null,
        isActive: warehouse.isActive,
        onHand,
        available,
        trackedItems: warehouse.inventoryItems.length,
      };
    });
  });
}

/** Adds a warehouse, optionally tied to a branch from the start. */
export async function createWarehouse(account: AuthenticatedAccount, payload: unknown): Promise<WarehouseView> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);

  const input = parseWrite(payload, false);
  await assertBranch(input.branchId);

  if ((input.kind ?? "STORAGE") === "STORE" && input.branchId) {
    const existingStore = await prisma.warehouse.findFirst({
      where: { branchId: input.branchId, kind: "STORE" },
      select: { id: true },
    });

    if (existingStore) {
      throw new ConflictError("This branch already has a store location.");
    }
  }

  const clash = await prisma.warehouse.findUnique({ where: { code: input.code! }, select: { id: true } });

  if (clash) {
    throw new ConflictError(`The warehouse code "${input.code}" already exists.`);
  }

  const created = await withDatabaseError(() =>
    prisma.warehouse.create({
      data: { code: input.code!, name: input.name!, branchId: null, kind: "STORAGE", isActive: input.isActive ?? true },
      select: { id: true, code: true, name: true, kind: true, branchId: true, isActive: true, branch: { select: { name: true } } },
    }),
  );

  await prisma.auditLog.create({
    data: {
      accountId: account.id,
      action: "WAREHOUSE_CREATED",
      entity: "Warehouse",
      entityId: created.id,
      newValue: `${created.code} — ${created.name}`,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    kind: created.kind,
    branchId: created.branchId,
    branchName: created.branch?.name ?? null,
    isActive: created.isActive,
    onHand: 0,
    available: 0,
    trackedItems: 0,
  };
}

/** Edits a warehouse: its names, its branch or whether it is active. */
export async function updateWarehouse(
  account: AuthenticatedAccount,
  warehouseId: string,
  payload: unknown,
): Promise<WarehouseView> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);

  if (!isUuid(warehouseId)) {
    throw new NotFoundError("The warehouse was not found.");
  }

  const existing = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true, code: true, branchId: true } });

  if (!existing) {
    throw new NotFoundError("The warehouse was not found.");
  }

  const input = parseWrite(payload, true);
  await assertBranch(input.branchId);

  if (input.kind === "STORE") {
    const targetBranchId = input.branchId !== undefined ? input.branchId : existing.branchId;

    if (targetBranchId) {
      const other = await prisma.warehouse.findFirst({
        where: { branchId: targetBranchId, kind: "STORE", NOT: { id: warehouseId } },
        select: { id: true },
      });

      if (other) {
        throw new ConflictError("This branch already has a store location.");
      }
    }
  }

  if (input.code && input.code !== existing.code) {
    const clash = await prisma.warehouse.findUnique({ where: { code: input.code }, select: { id: true } });

    if (clash) {
      throw new ConflictError(`The warehouse code "${input.code}" already exists.`);
    }
  }

  const updated = await withDatabaseError(() =>
    prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
      },
      select: { id: true, code: true, name: true, kind: true, branchId: true, isActive: true, branch: { select: { name: true } } },
    }),
  );

  await prisma.auditLog.create({
    data: {
      accountId: account.id,
      action: "WAREHOUSE_UPDATED",
      entity: "Warehouse",
      entityId: updated.id,
      newValue: `${updated.code} — ${updated.name}`,
    },
  });

  const stock = await prisma.inventoryItem.aggregate({
    where: { warehouseId: updated.id },
    _sum: { quantityOnHand: true, quantityReserved: true },
    _count: { _all: true },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    kind: updated.kind,
    branchId: updated.branchId,
    branchName: updated.branch?.name ?? null,
    isActive: updated.isActive,
    onHand: stock._sum.quantityOnHand ?? 0,
    available: (stock._sum.quantityOnHand ?? 0) - (stock._sum.quantityReserved ?? 0),
    trackedItems: stock._count._all,
  };
}

/**
 * Removes a warehouse that holds no stock history. Anything with inventory rows or
 * ledger movements is refused, because deleting it would erase where stock went;
 * deactivating it is the answer there.
 */
export async function ensureBranchStore(account: AuthenticatedAccount, branchId: string): Promise<WarehouseView> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);

  if (!isUuid(branchId)) {
    throw new NotFoundError("The branch was not found.");
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, code: true, name: true, isActive: true },
  });

  if (!branch || !branch.isActive) {
    throw new NotFoundError("The branch was not found.");
  }

  const existing = await prisma.warehouse.findFirst({
    where: { branchId, kind: "STORE" },
    select: { id: true, code: true, name: true, kind: true, branchId: true, isActive: true },
  });

  const store = existing ?? (await withDatabaseError(() =>
    prisma.warehouse.create({
      data: {
        code: `${branch.code}-STORE`.slice(0, 30),
        name: `محل ${branch.name}`.slice(0, 100),
        branchId,
        kind: "STORE",
        isActive: true,
      },
      select: { id: true, code: true, name: true, kind: true, branchId: true, isActive: true },
    }),
  ));

  if (!existing) {
    await prisma.auditLog.create({
      data: {
        accountId: account.id,
        action: "WAREHOUSE_CREATED",
        entity: "Warehouse",
        entityId: store.id,
        newValue: `${store.code} — ${store.name}`,
      },
    });
  }

  const stock = await prisma.inventoryItem.aggregate({
    where: { warehouseId: store.id },
    _sum: { quantityOnHand: true, quantityReserved: true },
    _count: { _all: true },
  });

  return {
    id: store.id,
    code: store.code,
    name: store.name,
    kind: store.kind,
    branchId: store.branchId,
    branchName: branch.name,
    isActive: store.isActive,
    onHand: stock._sum.quantityOnHand ?? 0,
    available: (stock._sum.quantityOnHand ?? 0) - (stock._sum.quantityReserved ?? 0),
    trackedItems: stock._count._all,
  };
}

export async function deleteWarehouse(account: AuthenticatedAccount, warehouseId: string): Promise<{ name: string }> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);

  if (!isUuid(warehouseId)) {
    throw new NotFoundError("The warehouse was not found.");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true, code: true, name: true, kind: true },
  });

  if (!warehouse) {
    throw new NotFoundError("The warehouse was not found.");
  }

  if (warehouse.kind === "STORE") {
    throw new ConflictError(
      "This is a branch store, not a warehouse. Stores are managed from the branch page and are never deleted from here.",
    );
  }

  const [items, movements] = await Promise.all([
    prisma.inventoryItem.count({ where: { warehouseId } }),
    prisma.stockMovement.count({ where: { warehouseId } }),
  ]);

  if (items > 0 || movements > 0) {
    throw new ConflictError(
      `"${warehouse.name}" holds stock history (${items} row(s), ${movements} movement(s)), so it cannot be deleted. Deactivate it instead.`,
    );
  }

  await prisma.$transaction([
    prisma.warehouse.delete({ where: { id: warehouse.id } }),
    prisma.auditLog.create({
      data: {
        accountId: account.id,
        action: "WAREHOUSE_DELETED",
        entity: "Warehouse",
        entityId: warehouse.id,
        newValue: `${warehouse.code} — ${warehouse.name}`,
      },
    }),
  ]);

  return { name: warehouse.name };
}
