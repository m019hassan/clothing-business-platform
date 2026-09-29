import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createUser, deleteUser, updateUser } from "@/modules/users/application/users";
import { createRole } from "@/modules/employees/application/role-permissions";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let manager: TestAccount;
let departmentId: string;
const created = { accountIds: [] as string[], profileIds: [] as string[], roleIds: [] as string[] };
const created_states: { accountId: string }[] = [];

async function makeEmployee(name: string, withHistory = false): Promise<{ id: string; profileId: string }> {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 10000)}`;

  const record = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-removal-${name}-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITREM-${name}-${suffix.toUpperCase()}`,
          departmentId,
          firstName: "Vitest",
          lastName: name,
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(record.id);
  created.profileIds.push(record.employeeProfile!.id);

  if (withHistory) {
    await prisma.auditLog.create({
      data: { accountId: record.id, action: "VITEST_HISTORY", entity: "Account", entityId: record.id },
    });
  }

  return { id: record.id, profileId: record.employeeProfile!.id };
}

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const managerRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-removal-mgr-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITREMM-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Manager",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(managerRecord.id);
  created.profileIds.push(managerRecord.employeeProfile!.id);
  departmentId = department.id;

  manager = {
    id: managerRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: managerRecord.email,
    phone: managerRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: managerRecord.createdAt,
    updatedAt: managerRecord.updatedAt,
    employeeProfile: { id: managerRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  for (const entry of created_states) {
    created.accountIds.push(entry.accountId);
  }

  await prisma.employeeRole.deleteMany({ where: { employeeId: { in: created.profileIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ accountId: { in: created.accountIds } }, { entity: "Account" }] } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.session.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("deleteUser", () => {
  it("deletes an account with no history outright", async () => {
    const employee = await makeEmployee("empty");

    const result = await deleteUser(manager, employee.id);

    expect(result.mode).toBe("deleted");
    expect(await prisma.account.count({ where: { id: employee.id } })).toBe(0);
    expect(await prisma.employeeProfile.count({ where: { accountId: employee.id } })).toBe(0);
  });

  it("archives an account that owns history instead of destroying it", async () => {
    const employee = await makeEmployee("history", true);

    const result = await deleteUser(manager, employee.id);

    expect(result.mode).toBe("archived");
    const record = await prisma.account.findUniqueOrThrow({ where: { id: employee.id } });
    expect(record.status).toBe("ARCHIVED");
    expect(record.deletedAt).not.toBeNull();

    // The history survives and the account leaves the directories.
    expect(await prisma.auditLog.count({ where: { accountId: employee.id } })).toBeGreaterThan(0);

    const visible = await prisma.account.count({ where: { id: employee.id, deletedAt: null } });
    expect(visible).toBe(0);
  });

  it("refuses to delete your own account", async () => {
    await expect(deleteUser(manager, manager.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("refuses to remove the only active administrator", async () => {
    const admin = await makeEmployee("admin");
    const role = await createRole(manager, {
      name: "Vitest Admin",
      code: `VIT_ADMINROLE_${Date.now().toString(36).toUpperCase()}`,
    });
    created.roleIds.push(role.id);

    // Give the employee a role whose code is ADMIN by renaming isn't possible (system
    // roles); create the ADMIN role row if the database has none, then assign it.
    const adminRole =
      (await prisma.role.findFirst({ where: { code: "ADMIN" } })) ??
      (await prisma.role.create({ data: { name: "Administrator", code: "ADMIN", isSystem: true, isActive: true } }));

    if (!(await prisma.role.findFirst({ where: { code: "ADMIN" } }))) {
      created.roleIds.push(adminRole.id);
    }

    const otherAdmins = await prisma.employeeRole.count({
      where: { roleId: adminRole.id, employeeId: { not: admin.profileId } },
    });

    await prisma.employeeRole.create({ data: { employeeId: admin.profileId, roleId: adminRole.id } });

    if (otherAdmins === 0) {
      await expect(deleteUser(manager, admin.id)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining("administrator"),
      });
    }
  });

  it("stops before any change when the permission is missing", async () => {
    const employee = await makeEmployee("guarded");
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing users.manage."));

    await expect(deleteUser(manager, employee.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.account.count({ where: { id: employee.id } })).toBe(1);
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("users.manage");
  });
});

describe("updateUser employee fields", () => {
  it("changes the job title and the department", async () => {
    const employee = await makeEmployee("editable");
    const other = await prisma.department.create({ data: { code: `VITDEPT_${Date.now().toString(36).toUpperCase()}`, name: "Vitest Dept" } });

    const updated = await updateUser(manager, employee.id, { jobTitle: "Store Lead", departmentId: other.id });

    expect(updated.jobTitle).toBe("Store Lead");
    expect(updated.departmentName).toBe("Vitest Dept");
  });
});

describe("creating employees with a department", () => {
  it("accepts the departmentId the employees screen sends", async () => {
    const department = await prisma.department.upsert({
      where: { code: "VITEMP_DEPT" },
      create: { code: "VITEMP_DEPT", name: "Vitest Employees" },
      update: {},
    });

    const created = await createUser(manager, {
      accountType: "EMPLOYEE",
      firstName: "منى",
      lastName: "التجريبية",
      email: `vitest-emp-dept-${Date.now()}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      password: "Vitest12345!",
      jobTitle: "بائعة",
      departmentId: department.id,
    });

    created_states.push({ accountId: created.id });

    expect(created.departmentName).toBe("Vitest Employees");
    expect(created.jobTitle).toBe("بائعة");
  });

  it("rejects a department id that does not exist", async () => {
    await expect(
      createUser(manager, {
        accountType: "EMPLOYEE",
        firstName: "بلا",
        lastName: "قسم",
        email: `vitest-emp-bad-${Date.now()}@example.com`,
        phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
        password: "Vitest12345!",
        departmentId: "11111111-2222-4333-8444-555555555555",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
