import "server-only";

import { AccountType, Prisma } from "@prisma/client";

import type {
  AccessOverviewView,
  EmployeeDetailView,
  EmployeePageView,
  EmployeeRowView,
  PermissionCatalogEntry,
  RoleView,
} from "@/modules/employees/types";
import { prisma } from "@/src/lib/db";
import { NotFoundError, withDatabaseError } from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

/**
 * Read-only staff administration views. There are no employee/role management
 * endpoints yet, so these reads expose only non-sensitive fields: salary,
 * nationalId and internal notes are deliberately never selected.
 */
const employeeSelection = {
  id: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  preferredLanguage: true,
  timezone: true,
  employeeProfile: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      hireDate: true,
      department: { select: { name: true } },
      employeeRoles: {
        select: { role: { select: { name: true, isActive: true } } },
      },
    },
  },
} satisfies Prisma.AccountSelect;

type EmployeeRecord = Prisma.AccountGetPayload<{ select: typeof employeeSelection }>;

const employeeWhere = {
  accountType: AccountType.EMPLOYEE,
  deletedAt: null,
} satisfies Prisma.AccountWhereInput;

function mapEmployee(record: EmployeeRecord): EmployeeRowView {
  const profile = record.employeeProfile;

  return {
    id: record.id,
    employeeNumber: profile?.employeeNumber ?? "—",
    firstName: profile?.firstName ?? "Unknown",
    lastName: profile?.lastName ?? null,
    email: record.email,
    phone: record.phone,
    accountStatus: record.status,
    jobTitle: profile?.jobTitle ?? null,
    departmentName: profile?.department?.name ?? null,
    hireDate: profile?.hireDate ? profile.hireDate.toISOString() : null,
    roles:
      profile?.employeeRoles
        .filter((entry) => entry.role.isActive)
        .map((entry) => entry.role.name) ?? [],
  };
}

export async function listEmployees(pagination: Pagination): Promise<EmployeePageView> {
  return withDatabaseError(async () => {
    const [records, total] = await Promise.all([
      prisma.account.findMany({
        where: employeeWhere,
        orderBy: [{ employeeProfile: { employeeNumber: "asc" } }, { id: "asc" }],
        take: pagination.limit,
        skip: pagination.offset,
        select: employeeSelection,
      }),
      prisma.account.count({ where: employeeWhere }),
    ]);

    return {
      rows: records.map(mapEmployee),
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

export async function getEmployee(accountId: string): Promise<EmployeeDetailView> {
  if (!isUuid(accountId)) {
    throw new NotFoundError("Employee not found.");
  }

  const record = await withDatabaseError(() =>
    prisma.account.findFirst({
      where: { id: accountId, ...employeeWhere },
      select: employeeSelection,
    }),
  );

  if (!record) {
    throw new NotFoundError("Employee not found.");
  }

  return {
    ...mapEmployee(record),
    createdAt: record.createdAt.toISOString(),
    preferredLanguage: record.preferredLanguage,
    timezone: record.timezone,
  };
}

export async function getAccessOverview(): Promise<AccessOverviewView> {
  return withDatabaseError(async () => {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          isActive: true,
          isSystem: true,
          rolePermissions: { select: { permission: { select: { code: true } } } },
          _count: { select: { employeeRoles: true } },
        },
      }),
      prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ module: "asc" }, { code: "asc" }],
        select: { code: true, name: true, module: true },
      }),
    ]);

    const catalogMap = new Map<string, PermissionCatalogEntry>();
    for (const permission of permissions) {
      const entry = catalogMap.get(permission.module) ?? { module: permission.module, permissions: [] };
      entry.permissions.push({ code: permission.code, name: permission.name });
      catalogMap.set(permission.module, entry);
    }

    const roleViews: RoleView[] = roles.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      isActive: role.isActive,
      isSystem: role.isSystem,
      permissionCodes: role.rolePermissions.map((entry) => entry.permission.code),
      employeeCount: role._count.employeeRoles,
    }));

    return {
      roles: roleViews,
      catalog: [...catalogMap.values()].sort((a, b) => a.module.localeCompare(b.module)),
    };
  });
}
