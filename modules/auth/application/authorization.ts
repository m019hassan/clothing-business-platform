import "server-only";

import { cache } from "react";
import { AccountType } from "@prisma/client";

import { prisma } from "@/src/lib/db";
import { AuthorizationError, withDatabaseError } from "@/src/lib/errors";
import { getCurrentAccount, requireAuthenticated } from "@/modules/auth/infrastructure/session";

const getEffectivePermissions = cache(async (): Promise<ReadonlySet<string>> => {
  const account = await getCurrentAccount();
  const employeeProfile = account?.employeeProfile;

  if (!account || account.accountType !== AccountType.EMPLOYEE || !employeeProfile) {
    return new Set<string>();
  }

  const employeeRoles = await withDatabaseError(() =>
    prisma.employeeRole.findMany({
      where: {
        employeeId: employeeProfile.id,
        role: { isActive: true },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: { permission: { isActive: true } },
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    }),
  );

  return new Set(
    employeeRoles.flatMap((employeeRole) =>
      employeeRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
    ),
  );
});

export async function hasPermission(permissionCode: string): Promise<boolean> {
  if (!permissionCode.trim()) {
    return false;
  }

  return (await getEffectivePermissions()).has(permissionCode);
}

export async function requirePermission(permissionCode: string): Promise<void> {
  await requireAuthenticated();

  if (!(await hasPermission(permissionCode))) {
    throw new AuthorizationError("You do not have permission to perform this action.");
  }
}

export async function getCurrentPermissions(): Promise<ReadonlySet<string>> {
  await requireAuthenticated();
  return getEffectivePermissions();
}