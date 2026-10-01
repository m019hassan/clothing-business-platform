import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createWarehouse, listWarehouses, updateWarehouse } from "@/modules/branches/application/warehouses";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let branchId: string;
const created = { accountIds: [] as string[], branchIds: [] as string[], warehouseIds: [] as string[] };

beforeEach(async () => {
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `WHB-${suffix.toUpperCase()}`, name: `WH Branch ${suffix}` },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-wh-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
    },
  });
  created.accountIds.push(staffRecord.id);

  staff = {
    id: staffRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: staffRecord.email,
    phone: staffRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: staffRecord.createdAt,
    updatedAt: staffRecord.updatedAt,
    employeeProfile: null,
  } as unknown as TestAccount;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("warehouse administration", () => {
  it("creates a warehouse linked to a branch and lists it with its numbers", async () => {
    const suffix = Date.now().toString(36).toUpperCase();
    const warehouse = await createWarehouse(staff, { code: `wh-${suffix}`, name: "مستودع الاختبار", branchId });
    created.warehouseIds.push(warehouse.id);

    expect(warehouse.code).toBe(`WH-${suffix}`);
    expect(warehouse.branchName).toContain("WH Branch");

    const audit = await prisma.auditLog.findFirst({ where: { entityId: warehouse.id, action: "WAREHOUSE_CREATED" } });
    expect(audit).not.toBeNull();

    const listed = await listWarehouses();
    expect(listed.some((entry) => entry.id === warehouse.id)).toBe(true);
  });

  it("refuses a duplicate code and an unknown branch", async () => {
    const suffix = Date.now().toString(36).toUpperCase();
    const warehouse = await createWarehouse(staff, { code: `wd-${suffix}`, name: "مستودع تكرار" });
    created.warehouseIds.push(warehouse.id);

    await expect(
      createWarehouse(staff, { code: `wd-${suffix}`, name: "نسخة" }),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      createWarehouse(staff, {
        code: `we-${suffix}`,
        name: "فرع مش موجود",
        branchId: "00000000-0000-4000-8000-000000000000",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates names, branch and the active flag", async () => {
    const suffix = Date.now().toString(36).toUpperCase();
    const warehouse = await createWarehouse(staff, { code: `wf-${suffix}`, name: "قبل التعديل" });
    created.warehouseIds.push(warehouse.id);

    const updated = await updateWarehouse(staff, warehouse.id, {
      name: "بعد التعديل",
      branchId,
      isActive: false,
    });

    expect(updated.name).toBe("بعد التعديل");
    expect(updated.branchId).toBe(branchId);
    expect(updated.isActive).toBe(false);

    const audit = await prisma.auditLog.findFirst({ where: { entityId: warehouse.id, action: "WAREHOUSE_UPDATED" } });
    expect(audit).not.toBeNull();
  });
});
