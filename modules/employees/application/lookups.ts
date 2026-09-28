import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { prisma } from "@/src/lib/db";

export type LookupOption = { id: string; label: string; code: string };

/**
 * Selectable values for the employee management screens. Displaying them needs the
 * same permission as the screen itself; changing an employee still goes through
 * PUT /api/users/:id with users.manage.
 */
export async function listDepartmentOptions(): Promise<LookupOption[]> {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW);

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return departments.map((department) => ({ id: department.id, label: department.name, code: department.code }));
}

/** Roles an employee can be given, in the same shape. */
export async function listRoleOptions(): Promise<LookupOption[]> {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW);

  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return roles.map((role) => ({ id: role.id, label: role.name, code: role.code }));
}

/** Branches an employee can belong to. */
export async function listBranchOptions(): Promise<LookupOption[]> {
  await requirePermission(PERMISSIONS.EMPLOYEES_VIEW);

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return branches.map((branch) => ({ id: branch.id, label: branch.name, code: branch.code }));
}
