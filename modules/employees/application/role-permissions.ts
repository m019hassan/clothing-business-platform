import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { PermissionCatalogEntry, RoleWithPermissionsView } from "@/modules/employees/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type RolePermissionsInput = { permissionCodes: string[] };

/** Validates a role-permission payload. Unknown keys are rejected. */
export function parseRolePermissionsInput(payload: unknown): RolePermissionsInput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => key !== "permissionCodes");

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (!Array.isArray(body.permissionCodes)) {
    throw new ValidationError("permissionCodes must be an array of permission codes.");
  }

  const codes = body.permissionCodes.filter((value): value is string => typeof value === "string");

  if (codes.length !== body.permissionCodes.length) {
    throw new ValidationError("permissionCodes must contain only strings.");
  }

  const normalized = codes.map((code) => code.trim()).filter((code) => code.length > 0);

  if (normalized.some((code) => code.length > 100)) {
    throw new ValidationError("Permission codes must be at most 100 characters.");
  }

  return { permissionCodes: [...new Set(normalized)] };
}

const roleSelection = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  isActive: true,
  rolePermissions: { select: { permission: { select: { code: true } } } },
} satisfies Prisma.RoleSelect;

type RoleRecord = Prisma.RoleGetPayload<{ select: typeof roleSelection }>;

function mapRole(record: RoleRecord): RoleWithPermissionsView {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    isSystem: record.isSystem,
    isActive: record.isActive,
    permissionCodes: record.rolePermissions.map((entry) => entry.permission.code).sort(),
  };
}

/** Roles with their granted codes (roles.view). */
export async function listRolesWithPermissions(): Promise<RoleWithPermissionsView[]> {
  await requirePermission(PERMISSIONS.ROLES_VIEW);

  const records = await withDatabaseError(() =>
    prisma.role.findMany({ select: roleSelection, orderBy: [{ name: "asc" }, { id: "asc" }] }),
  );

  return records.map(mapRole);
}

/** Every active permission, grouped by its module (roles.view). */
export async function listPermissionCatalog(): Promise<PermissionCatalogEntry[]> {
  await requirePermission(PERMISSIONS.ROLES_VIEW);

  const permissions = await withDatabaseError(() =>
    prisma.permission.findMany({
      where: { isActive: true },
      select: { code: true, name: true, module: true },
      orderBy: [{ module: "asc" }, { code: "asc" }],
    }),
  );

  const grouped = new Map<string, PermissionCatalogEntry>();

  for (const permission of permissions) {
    const key = permission.module ?? "general";
    const entry = grouped.get(key) ?? { module: key, permissions: [] };

    entry.permissions.push({ code: permission.code, name: permission.name });
    grouped.set(key, entry);
  }

  return [...grouped.values()];
}

/**
 * Replaces the permission set of a role (roles.update). System roles such as the
 * admin role are protected so an administrator cannot lock everyone out, and
 * unknown codes are rejected instead of being silently ignored.
 */
export async function updateRolePermissions(
  account: AuthenticatedAccount,
  roleId: string,
  payload: unknown,
): Promise<RoleWithPermissionsView> {
  await requirePermission(PERMISSIONS.ROLES_UPDATE);

  if (!isUuid(roleId)) {
    throw new NotFoundError("Role not found.");
  }

  const input = parseRolePermissionsInput(payload);

  const permissions = await withDatabaseError(() =>
    prisma.permission.findMany({
      where: { code: { in: input.permissionCodes }, isActive: true },
      select: { id: true, code: true },
    }),
  );

  if (permissions.length !== input.permissionCodes.length) {
    const found = new Set(permissions.map((permission) => permission.code));
    const missing = input.permissionCodes.filter((code) => !found.has(code));

    throw new NotFoundError(`Unknown permission code(s): ${missing.join(", ")}.`);
  }

  const role = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const current = await transaction.role.findUnique({
        where: { id: roleId },
        select: { id: true, isSystem: true, code: true },
      });

      if (!current) {
        throw new NotFoundError("Role not found.");
      }

      if (current.isSystem) {
        throw new ConflictError(
          `${current.code} is a system role maintained by the platform (see npm run make-admin) and cannot be edited here.`,
        );
      }

      await transaction.rolePermission.deleteMany({ where: { roleId } });

      if (permissions.length > 0) {
        await transaction.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
          skipDuplicates: true,
        });
      }

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "ROLE_PERMISSIONS_UPDATED",
          entity: "Role",
          entityId: roleId,
          newValue: input.permissionCodes.join(",").slice(0, 500),
        },
      });

      return transaction.role.findUniqueOrThrow({ where: { id: roleId }, select: roleSelection });
    }),
  );

  return mapRole(role);
}

export type RoleCreateInput = { name: string; code: string; description?: string };

const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
const MAX_ROLE_NAME = 100;
const MAX_ROLE_DESCRIPTION = 300;

/** Validates a role-creation payload. Unknown keys are rejected. */
export function parseRoleCreateInput(payload: unknown): RoleCreateInput {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => !["name", "code", "description"].includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    throw new ValidationError("name is required.");
  }

  const name = body.name.trim();

  if (name.length > MAX_ROLE_NAME) {
    throw new ValidationError(`name must be at most ${MAX_ROLE_NAME} characters.`);
  }

  if (typeof body.code !== "string" || body.code.trim().length === 0) {
    throw new ValidationError("code is required.");
  }

  const code = body.code.trim().toUpperCase();

  if (!ROLE_CODE_PATTERN.test(code)) {
    throw new ValidationError(
      "code must use capital letters, digits and underscores, and start with a letter (for example STORE_MANAGER).",
    );
  }

  const input: RoleCreateInput = { name, code };

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw new ValidationError("description must be a string when provided.");
    }

    const description = body.description.trim();

    if (description.length > MAX_ROLE_DESCRIPTION) {
      throw new ValidationError(`description must be at most ${MAX_ROLE_DESCRIPTION} characters.`);
    }

    if (description.length > 0) {
      input.description = description;
    }
  }

  return input;
}

/**
 * Creates an empty role. Permissions are granted afterwards from the matrix on the
 * roles screen, which keeps this action small and auditable.
 */
export async function createRole(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<RoleWithPermissionsView> {
  await requirePermission(PERMISSIONS.ROLES_CREATE);

  const input = parseRoleCreateInput(payload);

  const role = await withDatabaseError(async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        const created = await transaction.role.create({
          data: {
            name: input.name,
            code: input.code,
            description: input.description ?? null,
            isActive: true,
          },
          select: { id: true },
        });

        await transaction.auditLog.create({
          data: {
            accountId: account.id,
            action: "ROLE_CREATED",
            entity: "Role",
            entityId: created.id,
            newValue: input.code,
          },
        });

        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError(`The code "${input.code}" is already used by another role.`);
      }

      throw error;
    }
  });

  const roles = await listRolesWithPermissions();
  const created = roles.find((entry) => entry.id === role.id);

  if (!created) {
    throw new NotFoundError("Role not found.");
  }

  return created;
}
