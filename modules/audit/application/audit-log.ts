import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";

type Actor = NonNullable<SafeAccount>;

export type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  newValue: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditLogPage = {
  rows: AuditLogRow[];
  pagination: { limit: number; offset: number; total: number };
};

export type AuditLogFilters = { action?: string; entity?: string };

const MANAGED_LIMITS = { min: 1, max: 100 };

/** Reads the audit trail, newest first (audit.view). */
export async function listAuditLog(
  account: Actor,
  pagination: { limit: number; offset: number },
  filters: AuditLogFilters = {},
): Promise<AuditLogPage> {
  void account;
  await requirePermission(PERMISSIONS.AUDIT_VIEW);

  const limit = Math.min(Math.max(pagination.limit, MANAGED_LIMITS.min), MANAGED_LIMITS.max);
  const offset = Math.max(pagination.offset, 0);

  const where: Prisma.AuditLogWhereInput = {
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.entity ? { entity: filters.entity } : {}),
  };

  const [records, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        newValue: true,
        createdAt: true,
        account: {
          select: {
            email: true,
            employeeProfile: { select: { firstName: true, lastName: true } },
            customerProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    rows: records.map((record) => {
      const profile = record.account?.employeeProfile ?? record.account?.customerProfile ?? null;
      const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") : null;

      return {
        id: record.id,
        action: record.action,
        entity: record.entity,
        entityId: record.entityId,
        newValue: record.newValue,
        createdAt: record.createdAt.toISOString(),
        actorName: name,
        actorEmail: record.account?.email ?? null,
      };
    }),
    pagination: { limit, offset, total },
  };
}

/** Distinct action names, for the filter select. */
export async function listAuditActions(account: Actor): Promise<string[]> {
  void account;
  await requirePermission(PERMISSIONS.AUDIT_VIEW);

  const groups = await prisma.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } });

  return groups.map((group) => group.action);
}
