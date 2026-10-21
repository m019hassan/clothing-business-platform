import "server-only";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";

export type SelfRoleView = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
};

export type SelfProfileView = {
  roles: SelfRoleView[];
  /** Effective permission codes granted through active roles. */
  permissions: string[];
  branch: { name: string; code: string } | null;
  distributor: {
    code: string;
    canDiscount: boolean;
    discountCode: string | null;
    discountPercent: string | null;
  } | null;
};

/** Roles, effective permissions and branch for the signed-in account. */
export async function getSelfProfile(account: NonNullable<SafeAccount>): Promise<SelfProfileView> {
  return withDatabaseError(async () => {
    const employeeId = account.employeeProfile?.id ?? null;

    const employeeRoles = employeeId
      ? await prisma.employeeRole.findMany({
          where: { employeeId, role: { isActive: true } },
          orderBy: { role: { name: "asc" } },
          select: {
            role: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
                isSystem: true,
                rolePermissions: {
                  where: { permission: { isActive: true } },
                  select: { permission: { select: { code: true } } },
                },
              },
            },
          },
        })
      : [];

    const roles = employeeRoles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isSystem: role.isSystem,
    }));

    const permissions = Array.from(
      new Set(employeeRoles.flatMap(({ role }) => role.rolePermissions.map((entry) => entry.permission.code))),
    ).sort();

    const branchId = account.distributorProfile?.branchId ?? account.employeeProfile?.branchId ?? null;
    const branch = branchId
      ? await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true, code: true } })
      : null;

    return {
      roles,
      permissions,
      branch,
      distributor: account.distributorProfile
        ? {
            code: account.distributorProfile.distributorCode,
            canDiscount: account.distributorProfile.canDiscount === true,
            discountCode: account.distributorProfile.discountCode,
            discountPercent: account.distributorProfile.discountPercent?.toString() ?? null,
          }
        : null,
    };
  });
}
