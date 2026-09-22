import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import {
  createUser,
  getUser,
  listUsers,
  parseUserCreateInput,
  parseUserListFilters,
  parseUserUpdateInput,
  resetUserPassword,
  updateUser,
} from "@/modules/users/application/users";
import { prisma } from "@/src/lib/db";

const TEST_PASSWORD = "VitestPass123!";

const created = { accountIds: [] as string[], roleIds: [] as string[] };
let suffix: string;
let admin: { id: string; accountType: "EMPLOYEE" };

function customerPayload(overrides: Record<string, unknown> = {}) {
  return {
    accountType: "CUSTOMER",
    email: `vitest-user-${suffix}@example.com`,
    phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: TEST_PASSWORD,
    firstName: "Vitest",
    lastName: "Customer",
    ...overrides,
  };
}

function employeePayload(overrides: Record<string, unknown> = {}) {
  return {
    accountType: "EMPLOYEE",
    email: `vitest-staff-${suffix}@example.com`,
    phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
    password: TEST_PASSWORD,
    firstName: "Vitest",
    lastName: "Staff",
    ...overrides,
  };
}

beforeEach(async () => {
  suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));

  const actingAdmin = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-acting-admin-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITADM-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Acting",
          lastName: "Admin",
        },
      },
    },
    select: { id: true },
  });

  created.accountIds.push(actingAdmin.id);
  admin = { id: actingAdmin.id, accountType: "EMPLOYEE" };
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeRole.deleteMany({ where: { employee: { accountId: { in: created.accountIds } } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
});

describe("parsers", () => {
  it("validates account creation payloads", () => {
    expect(parseUserCreateInput(customerPayload()).accountType).toBe("CUSTOMER");
    expect(parseUserCreateInput(customerPayload({ email: " Mixed@Example.COM " })).email).toBe("mixed@example.com");

    expect(() => parseUserCreateInput(customerPayload({ password: "short" }))).toThrowError();
    expect(() => parseUserCreateInput(customerPayload({ email: "nope" }))).toThrowError();
    expect(() => parseUserCreateInput(customerPayload({ accountType: "DISTRIBUTOR" }))).toThrowError();
    expect(() => parseUserCreateInput(customerPayload({ extra: 1 }))).toThrowError();
    expect(() => parseUserUpdateInput({})).toThrowError();
    expect(() => parseUserUpdateInput({ status: "DELETED" })).toThrowError();
    expect(() => parseUserListFilters(new URLSearchParams({ type: "ROBOT" }))).toThrowError();
    expect(parseUserListFilters(new URLSearchParams({ type: "EMPLOYEE", status: "ACTIVE", q: " ahmed " }))).toEqual({
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      search: "ahmed",
    });
  });
});

describe("createUser", () => {
  it("creates a customer account with a classification and a unique code", async () => {
    const user = await createUser(admin as never, customerPayload());
    created.accountIds.push(user.id);

    expect(user.accountType).toBe("CUSTOMER");
    expect(user.status).toBe("ACTIVE");
    expect(user.displayName).toBe("Vitest Customer");
    expect(user.profileCode).toMatch(/^C-/);

    const record = await prisma.account.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    expect(record.passwordHash).not.toBe(TEST_PASSWORD);
  });

  it("creates an employee with roles and a branch", async () => {
    const branch = await prisma.branch.findFirstOrThrow({ where: { code: "FACTORY" }, select: { id: true } });
    const roleCode = `VITROLE_${suffix.toUpperCase()}`;
    const role = await prisma.role.create({
      data: { code: roleCode, name: `Vitest Role ${suffix}`, isActive: true },
      select: { id: true },
    });
    created.roleIds.push(role.id);

    const user = await createUser(admin as never, employeePayload({ roleIds: [role.id], branchId: branch.id, jobTitle: "Cashier" }));
    created.accountIds.push(user.id);

    expect(user.accountType).toBe("EMPLOYEE");
    expect(user.branchId).toBe(branch.id);
    expect(user.roles.map((entry) => entry.code)).toEqual([roleCode]);
  });

  it("rejects duplicates, unknown roles/branches and short passwords", async () => {
    const first = await createUser(admin as never, customerPayload());
    created.accountIds.push(first.id);

    await expect(createUser(admin as never, customerPayload())).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      createUser(admin as never, employeePayload({ roleIds: ["00000000-0000-4000-8000-000000000000"] })),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      createUser(admin as never, employeePayload({ branchId: "00000000-0000-4000-8000-000000000000" })),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(createUser(admin as never, customerPayload({ password: "123" }))).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("updateUser", () => {
  it("renames, suspends and reactivates an account (clearing the lockout)", async () => {
    const user = await createUser(admin as never, customerPayload());
    created.accountIds.push(user.id);

    await prisma.account.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 60_000) },
    });

    const renamed = await updateUser(admin as never, user.id, { firstName: "Renamed", status: "SUSPENDED" });
    expect(renamed.displayName).toBe("Renamed Customer");
    expect(renamed.status).toBe("SUSPENDED");

    const reactivated = await updateUser(admin as never, user.id, { status: "ACTIVE" });
    expect(reactivated.status).toBe("ACTIVE");

    const record = await prisma.account.findUniqueOrThrow({
      where: { id: user.id },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
    expect(record.failedLoginAttempts).toBe(0);
    expect(record.lockedUntil).toBeNull();
  });

  it("replaces employee roles and detaches the branch", async () => {
    const roleA = await prisma.role.create({ data: { code: `VITRA_${suffix}`, name: "A", isActive: true }, select: { id: true } });
    const roleB = await prisma.role.create({ data: { code: `VITRB_${suffix}`, name: "B", isActive: true }, select: { id: true } });
    created.roleIds.push(roleA.id, roleB.id);

    const user = await createUser(admin as never, employeePayload({ roleIds: [roleA.id] }));
    created.accountIds.push(user.id);

    const updated = await updateUser(admin as never, user.id, { roleIds: [roleB.id], branchId: null });
    expect(updated.roles.map((entry) => entry.id)).toEqual([roleB.id]);
    expect(updated.branchId).toBeNull();
  });

  it("refuses to change the status of the acting account", async () => {
    await expect(updateUser(admin as never, admin.id, { status: "SUSPENDED" })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects unknown ids", async () => {
    await expect(getUser(admin as never, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateUser(admin as never, "not-a-uuid", { firstName: "x" })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("resetUserPassword", () => {
  it("sets a new password and revokes every session", async () => {
    const user = await createUser(admin as never, customerPayload());
    created.accountIds.push(user.id);

    await prisma.session.create({
      data: { accountId: user.id, refreshToken: `vitest-${suffix}`, expiresAt: new Date(Date.now() + 3600_000) },
    });

    const result = await resetUserPassword(admin as never, user.id, { password: "NewPassword123!" });

    expect(result.sessionsRevoked).toBeGreaterThanOrEqual(1);

    const record = await prisma.account.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    expect(await bcrypt.compare("NewPassword123!", record.passwordHash)).toBe(true);

    await expect(resetUserPassword(admin as never, user.id, { password: "short" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(resetUserPassword(admin as never, user.id, { password: "LongEnough123", extra: 1 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("listUsers", () => {
  it("filters by type, status and search with pagination", async () => {
    const user = await createUser(admin as never, customerPayload({ firstName: "Findable" }));
    created.accountIds.push(user.id);

    const byType = await listUsers(admin as never, { limit: 5, offset: 0 }, { accountType: "EMPLOYEE" });
    expect(byType.users.every((entry) => entry.accountType === "EMPLOYEE")).toBe(true);

    const bySearch = await listUsers(admin as never, { limit: 20, offset: 0 }, { search: `vitest-user-${suffix}` });
    expect(bySearch.pagination.total).toBe(1);
    expect(bySearch.users[0].id).toBe(user.id);

    const suspended = await listUsers(admin as never, { limit: 20, offset: 0 }, { status: "SUSPENDED", search: `vitest-user-${suffix}` });
    expect(suspended.pagination.total).toBe(0);

    const firstPage = await listUsers(admin as never, { limit: 1, offset: 0 });
    expect(firstPage.users).toHaveLength(1);
    expect(firstPage.pagination.total).toBeGreaterThan(1);
  });
});
