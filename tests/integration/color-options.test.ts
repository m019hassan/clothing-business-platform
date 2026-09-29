import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createColorOption,
  deleteColorOption,
  listColorOptions,
} from "@/modules/catalog/application/colors";
import { ConflictError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
const created = { accountIds: [] as string[], colorIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-colors-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITCOL-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Colours",
        },
      },
    },
    include: { employeeProfile: true },
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
    employeeProfile: { id: staffRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.colorOption.deleteMany({ where: { id: { in: created.colorIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("colour library", () => {
  it("creates a colour and lists it with the library", async () => {
    const color = await createColorOption(staff, { name: "Vitest Maroon", hex: "#7f1d1d" });
    created.colorIds.push(color.id);

    expect(color.name).toBe("Vitest Maroon");
    expect(color.hex).toBe("#7F1D1D");

    const listed = await listColorOptions();
    expect(listed.some((entry) => entry.id === color.id)).toBe(true);
  });

  it("rejects a duplicate colour name", async () => {
    const color = await createColorOption(staff, { name: "Vitest Teal", hex: "#0f766e" });
    created.colorIds.push(color.id);

    await expect(createColorOption(staff, { name: "Vitest Teal", hex: "#0f766e" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("rejects a malformed colour code", async () => {
    await expect(createColorOption(staff, { name: "Vitest Lime", hex: "green" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("refuses to delete a colour that a variant still uses", async () => {
    const suffix = Date.now().toString(36);
    const category =
      (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
      (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
    const product = await prisma.product.create({
      data: {
        name: `Vitest Colour Use ${suffix}`,
        slug: `vitest-colour-use-${suffix}`,
        status: "ACTIVE",
        basePrice: "50.00",
        currency: "SAR",
        categoryId: category.id,
        variants: { create: [{ sku: `VITCOL-U-${suffix.toUpperCase()}`, color: "Vitest InUse", status: "ACTIVE" }] },
      },
      include: { variants: true },
    });
    created.productIds.push(product.id);
    created.variantIds.push(...product.variants.map((variant) => variant.id));

    const color = await createColorOption(staff, { name: "Vitest InUse", hex: "#0ea5e9" });
    created.colorIds.push(color.id);

    await expect(deleteColorOption(staff, color.id)).rejects.toBeInstanceOf(ConflictError);

    await prisma.productVariant.deleteMany({ where: { id: { in: product.variants.map((variant) => variant.id) } } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    await deleteColorOption(staff, color.id);
    created.colorIds = created.colorIds.filter((id) => id !== color.id);
  });

  it("deletes an unused colour and reports the usage count", async () => {
    const color = await createColorOption(staff, { name: "Vitest Aubergine", hex: "#3b0764" });
    created.colorIds.push(color.id);

    const removed = await deleteColorOption(staff, color.id);
    expect(removed.name).toBe("Vitest Aubergine");

    const listed = await listColorOptions();
    expect(listed.some((entry) => entry.id === color.id)).toBe(false);
  });
});
