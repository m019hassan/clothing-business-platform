import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createRole,
  deleteRole,
  parseRoleUpdateInput,
  updateRole,
} from "@/modules/employees/application/role-permissions";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let admin: TestAccount;
let employeeProfileId: string;
const created = { accountIds: [] as string[], roleIds: [] as string[], profileIds: [] as string[] };

/** A role flagged as a system role; the platform maintains those outside the UI. */
async function systemRole() {
  const code = `VIT_SYSTEM_${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
  const role = await prisma.role.create({
    data: { name: "Vitest System", code, isSystem: true, isActive: true },
    select: { id: true },
  });
  created.roleIds.push(role.id);

  return role;
}

async function freeRole(name = "Vitest Role") {
  const code = `VIT_MGMT_${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
  const role = await createRole(admin, { name, code });
  created.roleIds.push(role.id);

  return role;
}

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const adminRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-mgmt-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITMGMT-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Manager",
        },
      },
    },
    include: { employeeProfile: true },
  });
  const holderRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-mgmt-holder-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITMGOTH-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Holder",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(adminRecord.id, holderRecord.id);
  created.profileIds.push(adminRecord.employeeProfile!.id, holderRecord.employeeProfile!.id);
  employeeProfileId = holderRecord.employeeProfile!.id;

  admin = {
    id: adminRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: adminRecord.email,
    phone: adminRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: adminRecord.createdAt,
    updatedAt: adminRecord.updatedAt,
    employeeProfile: { id: adminRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.employeeRole.deleteMany({ where: { employeeId: { in: created.profileIds } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseRoleUpdateInput", () => {
  it("accepts partial edits and trims strings", () => {
    expect(parseRoleUpdateInput({ name: "  Store Manager " })).toEqual({ name: "Store Manager" });
    expect(parseRoleUpdateInput({ description: "  " })).toEqual({ description: "" });
    expect(parseRoleUpdateInput({ isActive: false })).toEqual({ isActive: false });
  });

  it("rejects empty payloads, empty names and unknown keys", () => {
    expect(() => parseRoleUpdateInput({})).toThrowError();
    expect(() => parseRoleUpdateInput({ name: "  " })).toThrowError();
    expect(() => parseRoleUpdateInput({ isActive: "yes" })).toThrowError();
    expect(() => parseRoleUpdateInput({ code: "X" })).toThrowError();
  });
});

describe("updateRole", () => {
  it("renames a role, edits the description and toggles it, auditing the change", async () => {
    const role = await freeRole();

    const renamed = await updateRole(admin, role.id, { name: "Store Manager", description: "Owns the shop floor" });
    expect(renamed.name).toBe("Store Manager");
    expect(renamed.description).toBe("Owns the shop floor");

    const deactivated = await updateRole(admin, role.id, { isActive: false });
    expect(deactivated.isActive).toBe(false);

    const audits = await prisma.auditLog.findMany({ where: { accountId: admin.id, action: "ROLE_UPDATED" } });
    expect(audits.length).toBe(2);
  });

  it("refuses to edit a system role", async () => {
    const system = await systemRole();

    await expect(updateRole(admin, system.id, { name: "Hacked" })).rejects.toMatchObject({ statusCode: 409 });
  });

  it("stops before any change when the permission is missing", async () => {
    const role = await freeRole("Guarded");
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing roles.update."));

    await expect(updateRole(admin, role.id, { name: "Nope" })).rejects.toMatchObject({ statusCode: 403 });

    const record = await prisma.role.findUniqueOrThrow({ where: { id: role.id } });
    expect(record.name).toBe("Guarded");
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("roles.update");
  });
});

describe("deleteRole", () => {
  it("deletes a role nobody holds together with its permissions", async () => {
    const role = await freeRole("Disposable");
    await updateRole(admin, role.id, { name: "Disposable" });

    await deleteRole(admin, role.id);

    expect(await prisma.role.count({ where: { id: role.id } })).toBe(0);
    expect(await prisma.rolePermission.count({ where: { roleId: role.id } })).toBe(0);

    const audit = await prisma.auditLog.findFirst({ where: { accountId: admin.id, action: "ROLE_DELETED" } });
    expect(audit?.entityId).toBe(role.id);
  });

  it("refuses to delete a role an employee still holds and says how many", async () => {
    const role = await freeRole("In Use");
    await prisma.employeeRole.create({ data: { employeeId: employeeProfileId, roleId: role.id } });

    await expect(deleteRole(admin, role.id)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("1 employee"),
    });
    expect(await prisma.role.count({ where: { id: role.id } })).toBe(1);
  });

  it("refuses to delete a system role", async () => {
    const system = await systemRole();

    await expect(deleteRole(admin, system.id)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("stops before deleting when the permission is missing", async () => {
    const role = await freeRole("Protected");
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing roles.delete."));

    await expect(deleteRole(admin, role.id)).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.role.count({ where: { id: role.id } })).toBe(1);
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("roles.delete");
  });
});
