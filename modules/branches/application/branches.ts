import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { BranchView } from "@/modules/branches/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_CODE = 50;
const MAX_NAME = 150;
const MAX_PHONE = 30;
const MAX_ADDRESS = 200;
const MAX_CITY = 100;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

export type BranchWriteInput = {
  code?: string;
  name?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  isActive?: boolean;
  warehouseIds?: string[];
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseRequiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

function parseOptionalText(value: unknown, field: string, max: number): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string or null.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

function parseCode(value: unknown): string {
  const code = parseRequiredText(value, "code", MAX_CODE).toUpperCase();

  if (!CODE_PATTERN.test(code)) {
    throw new ValidationError("code may only contain uppercase letters, digits, dashes and underscores.");
  }

  return code;
}

/** Validates a branch create/update payload. Unknown keys are rejected. */
export function parseBranchWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): BranchWriteInput {
  const body = asRecord(payload);
  const allowed = ["code", "name", "phone", "address", "city", "isActive", "warehouseIds"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: BranchWriteInput = {};

  if (body.code !== undefined) {
    input.code = parseCode(body.code);
  } else if (!partial) {
    throw new ValidationError("code is required.");
  }

  if (body.name !== undefined) {
    input.name = parseRequiredText(body.name, "name", MAX_NAME);
  } else if (!partial) {
    throw new ValidationError("name is required.");
  }

  if (body.phone !== undefined) input.phone = parseOptionalText(body.phone, "phone", MAX_PHONE);
  if (body.address !== undefined) input.address = parseOptionalText(body.address, "address", MAX_ADDRESS);
  if (body.city !== undefined) input.city = parseOptionalText(body.city, "city", MAX_CITY);

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError("isActive must be a boolean.");
    }

    input.isActive = body.isActive;
  }

  if (body.warehouseIds !== undefined) {
    if (!Array.isArray(body.warehouseIds)) {
      throw new ValidationError("warehouseIds must be an array of warehouse ids.");
    }

    const ids = body.warehouseIds.filter((value): value is string => typeof value === "string");

    if (ids.length !== body.warehouseIds.length) {
      throw new ValidationError("warehouseIds must contain only warehouse ids.");
    }

    if (!ids.every((id) => isUuid(id))) {
      throw new ValidationError("warehouseIds must contain valid warehouse ids.");
    }

    input.warehouseIds = ids;
  }

  if (partial && Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

const branchSelection = {
  id: true,
  code: true,
  name: true,
  phone: true,
  address: true,
  city: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  warehouses: {
    select: { id: true, code: true, name: true, isActive: true },
    orderBy: { code: "asc" },
  },
} satisfies Prisma.BranchSelect;

type BranchRecord = Prisma.BranchGetPayload<{ select: typeof branchSelection }>;

function mapBranch(record: BranchRecord): BranchView {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    phone: record.phone,
    address: record.address,
    city: record.city,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    warehouses: record.warehouses,
  };
}

/** Branch directory (staff only). */
export async function listBranches(
  account: AuthenticatedAccount,
  options: { includeInactive?: boolean } = {},
): Promise<BranchView[]> {
  await requirePermission(PERMISSIONS.BRANCHES_VIEW);

  const records = await withDatabaseError(() =>
    prisma.branch.findMany({
      where: options.includeInactive === true ? {} : { isActive: true },
      select: branchSelection,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  );

  return records.map(mapBranch);
}

export async function getBranch(
  account: AuthenticatedAccount,
  branchId: string,
): Promise<BranchView> {
  await requirePermission(PERMISSIONS.BRANCHES_VIEW);

  if (!isUuid(branchId)) {
    throw new NotFoundError("Branch not found.");
  }

  const record = await withDatabaseError(() =>
    prisma.branch.findUnique({ where: { id: branchId }, select: branchSelection }),
  );

  if (!record) {
    throw new NotFoundError("Branch not found.");
  }

  return mapBranch(record);
}

async function assertWarehousesExist(warehouseIds: string[]): Promise<void> {
  if (warehouseIds.length === 0) {
    return;
  }

  const found = await withDatabaseError(() =>
    prisma.warehouse.count({ where: { id: { in: warehouseIds } } }),
  );

  if (found !== warehouseIds.length) {
    throw new NotFoundError("One or more warehouses were not found.");
  }
}

export async function createBranch(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<BranchView> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);
  const input = parseBranchWriteInput(payload, { partial: false });
  await assertWarehousesExist(input.warehouseIds ?? []);

  const record = await withDatabaseError(async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        const branch = await transaction.branch.create({
          data: {
            code: input.code as string,
            name: input.name as string,
            phone: input.phone ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            isActive: input.isActive ?? true,
          },
          select: { id: true },
        });

        if (input.warehouseIds && input.warehouseIds.length > 0) {
          await transaction.warehouse.updateMany({
            where: { id: { in: input.warehouseIds } },
            data: { branchId: branch.id },
          });
        }

        return transaction.branch.findUniqueOrThrow({ where: { id: branch.id }, select: branchSelection });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A branch with this code already exists.");
      }

      throw error;
    }
  });

  return mapBranch(record);
}

export async function updateBranch(
  account: AuthenticatedAccount,
  branchId: string,
  payload: unknown,
): Promise<BranchView> {
  await requirePermission(PERMISSIONS.BRANCHES_MANAGE);

  if (!isUuid(branchId)) {
    throw new NotFoundError("Branch not found.");
  }

  const input = parseBranchWriteInput(payload, { partial: true });
  await assertWarehousesExist(input.warehouseIds ?? []);

  const existing = await withDatabaseError(() =>
    prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
  );

  if (!existing) {
    throw new NotFoundError("Branch not found.");
  }

  const record = await withDatabaseError(async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        const data: Prisma.BranchUpdateInput = {};

        if (input.code !== undefined) data.code = input.code;
        if (input.name !== undefined) data.name = input.name;
        if (input.phone !== undefined) data.phone = input.phone;
        if (input.address !== undefined) data.address = input.address;
        if (input.city !== undefined) data.city = input.city;
        if (input.isActive !== undefined) data.isActive = input.isActive;

        if (Object.keys(data).length > 0) {
          await transaction.branch.update({ where: { id: branchId }, data });
        }

        if (input.warehouseIds !== undefined) {
          // Replace the assignment set: detach the removed ones, attach the new ones.
          await transaction.warehouse.updateMany({
            where: { branchId, id: { notIn: input.warehouseIds } },
            data: { branchId: null },
          });

          if (input.warehouseIds.length > 0) {
            await transaction.warehouse.updateMany({
              where: { id: { in: input.warehouseIds } },
              data: { branchId },
            });
          }
        }

        if (Object.keys(data).length === 0 && input.warehouseIds === undefined) {
          throw new ValidationError("Provide at least one field to update.");
        }

        return transaction.branch.findUniqueOrThrow({ where: { id: branchId }, select: branchSelection });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A branch with this code already exists.");
      }

      throw error;
    }
  });

  return mapBranch(record);
}
