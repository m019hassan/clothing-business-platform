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
  parseRoleCreateInput,
  updateRolePermissions,
} from "@/modules/employees/application/role-permissions";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let admin: TestAccount;
const created = { accountIds: [] as string[], roleIds: [] as string[] };

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const record = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-role-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITROLE-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Roles",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(record.id);

  admin = {
    id: record.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: record.email,
    phone: record.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    employeeProfile: { id: record.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseRoleCreateInput", () => {
  it("normalises the code and trims the name", () => {
    expect(parseRoleCreateInput({ name: "  Store Manager ", code: " store_manager " })).toEqual({
      name: "Store Manager",
      code: "STORE_MANAGER",
    });
  });

  it("rejects missing fields, bad codes and unknown keys", () => {
    expect(() => parseRoleCreateInput({ code: "X_Y" })).toThrowError();
    expect(() => parseRoleCreateInput({ name: "x" })).toThrowError();
    expect(() => parseRoleCreateInput({ name: "x", code: "1BAD" })).toThrowError();
    expect(() => parseRoleCreateInput({ name: "x", code: "bad code" })).toThrowError();
    expect(() => parseRoleCreateInput({ name: "x", code: "OK", extra: 1 })).toThrowError();
  });
});

describe("createRole", () => {
  it("creates an empty role and audits it", async () => {
    const code = `VIT_ROLE_${Date.now().toString(36).toUpperCase()}`;
    const role = await createRole(admin, { name: "Vitest Role", code });

    created.roleIds.push(role.id);

    expect(role.code).toBe(code);
    expect(role.permissionCodes).toEqual([]);
    expect(role.isSystem).toBe(false);

    const audit = await prisma.auditLog.findFirst({ where: { accountId: admin.id, action: "ROLE_CREATED" } });
    expect(audit?.newValue).toBe(code);
  });

  it("refuses a duplicate code and names it", async () => {
    const code = `VIT_DUP_${Date.now().toString(36).toUpperCase()}`;
    const role = await createRole(admin, { name: "First", code });
    created.roleIds.push(role.id);

    await expect(createRole(admin, { name: "Second", code })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining(code),
    });
  });

  it("accepts permissions afterwards through the existing matrix", async () => {
    const code = `VIT_GRANT_${Date.now().toString(36).toUpperCase()}`;
    const role = await createRole(admin, { name: "Granted", code });
    created.roleIds.push(role.id);

    // The catalogue is seeded by make-admin in development; make sure the two codes
    // this test grants exist in whatever database the suite runs against.
    for (const permissionCode of ["products.view", "orders.view"]) {
      await prisma.permission.upsert({
        where: { code: permissionCode },
        create: { code: permissionCode, name: permissionCode, module: permissionCode.split(".")[0], isActive: true },
        update: { isActive: true },
      });
    }

    const updated = await updateRolePermissions(admin, role.id, { permissionCodes: ["products.view", "orders.view"] });

    expect(updated.permissionCodes.sort()).toEqual(["orders.view", "products.view"]);
  });

  it("stops before creating anything when the permission is missing", async () => {
    const code = `VIT_DENY_${Date.now().toString(36).toUpperCase()}`;
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing roles.create."));

    await expect(createRole(admin, { name: "Denied", code })).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.role.count({ where: { code } })).toBe(0);
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("roles.create");
  });
});
