import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createBranch,
  getBranch,
  listBranches,
  parseBranchWriteInput,
  updateBranch,
} from "@/modules/branches/application/branches";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const account = { id: "00000000-0000-4000-8000-00000000cafe", accountType: "EMPLOYEE" } as TestAccount;
const createdBranchIds: string[] = [];
const createdWarehouseIds: string[] = [];
let suffix: string;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    code: `BR-${suffix.toUpperCase()}`,
    name: `Branch ${suffix}`,
    phone: "+966500000000",
    city: "Jeddah",
    ...overrides,
  };
}

beforeEach(async () => {
  suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);
});

afterAll(async () => {
  await prisma.branch.deleteMany({ where: { id: { in: createdBranchIds } } });
  await prisma.warehouse.updateMany({ where: { id: { in: createdWarehouseIds } }, data: { branchId: null } });
  await prisma.warehouse.deleteMany({ where: { id: { in: createdWarehouseIds } } });
});

describe("parseBranchWriteInput", () => {
  it("normalises a valid payload", () => {
    expect(
      parseBranchWriteInput(
        { code: ` br-${suffix} `, name: "  Main Branch ", phone: "  ", address: null, isActive: false },
        { partial: false },
      ),
    ).toEqual({
      code: `BR-${suffix.toUpperCase()}`,
      name: "Main Branch",
      phone: null,
      address: null,
      isActive: false,
    });
  });

  it("requires code and name on create and rejects junk", () => {
    expect(() => parseBranchWriteInput({ name: "x" }, { partial: false })).toThrowError();
    expect(() => parseBranchWriteInput({ code: "ok" }, { partial: false })).toThrowError();
    expect(() => parseBranchWriteInput({ code: "bad code", name: "x" }, { partial: false })).toThrowError();
    expect(() => parseBranchWriteInput({ code: "OK", name: "x", extra: 1 }, { partial: false })).toThrowError();
    expect(() => parseBranchWriteInput({ isActive: "yes" }, { partial: true })).toThrowError();
    expect(() => parseBranchWriteInput({ warehouseIds: ["not-a-uuid"] }, { partial: true })).toThrowError();
    expect(() => parseBranchWriteInput({}, { partial: true })).toThrowError();
  });
});

describe("branch lifecycle", () => {
  it("creates, reads and lists branches", async () => {
    const branch = await createBranch(account, payload());
    createdBranchIds.push(branch.id);

    expect(branch.code).toBe(`BR-${suffix.toUpperCase()}`);
    expect(branch.isActive).toBe(true);
    expect(branch.warehouses).toEqual([]);

    const fetched = await getBranch(account, branch.id);
    expect(fetched.id).toBe(branch.id);

    const list = await listBranches(account);
    expect(list.some((entry) => entry.id === branch.id)).toBe(true);
  });

  it("rejects a duplicate code with a conflict", async () => {
    const branch = await createBranch(account, payload());
    createdBranchIds.push(branch.id);

    await expect(createBranch(account, payload({ name: "Another" }))).rejects.toMatchObject({ statusCode: 409 });
  });

  it("attaches and detaches warehouses", async () => {
    const warehouse = await prisma.warehouse.create({
      data: { code: `WH-${suffix.toUpperCase()}`, name: `Warehouse ${suffix}` },
      select: { id: true },
    });
    createdWarehouseIds.push(warehouse.id);

    const branch = await createBranch(account, payload({ warehouseIds: [warehouse.id] }));
    createdBranchIds.push(branch.id);

    expect(branch.warehouses.map((entry) => entry.id)).toEqual([warehouse.id]);

    const detached = await updateBranch(account, branch.id, { warehouseIds: [] });
    expect(detached.warehouses).toEqual([]);

    await expect(
      createBranch(account, payload({ code: `BR2-${suffix.toUpperCase()}`, warehouseIds: ["00000000-0000-4000-8000-000000000000"] })),
    ).rejects.toMatchObject({ statusCode: 404 });

    // re-attach for cleanup coverage
    await updateBranch(account, branch.id, { warehouseIds: [warehouse.id] });
  });

  it("updates fields, deactivates and hides from the default list", async () => {
    const branch = await createBranch(account, payload());
    createdBranchIds.push(branch.id);

    const renamed = await updateBranch(account, branch.id, { name: "Renamed Branch", city: "Dammam" });
    expect(renamed.name).toBe("Renamed Branch");
    expect(renamed.city).toBe("Dammam");

    await updateBranch(account, branch.id, { isActive: false });

    const activeOnly = await listBranches(account);
    expect(activeOnly.some((entry) => entry.id === branch.id)).toBe(false);

    const withInactive = await listBranches(account, { includeInactive: true });
    expect(withInactive.some((entry) => entry.id === branch.id)).toBe(true);
  });

  it("rejects unknown ids and empty updates", async () => {
    await expect(getBranch(account, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ statusCode: 404 });
    await expect(getBranch(account, "not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      updateBranch(account, "00000000-0000-4000-8000-000000000000", { name: "Ghost" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateBranch(account, "not-a-uuid", { name: "Ghost" })).rejects.toMatchObject({ statusCode: 404 });
  });
});
