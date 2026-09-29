import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createSizeOption,
  deleteSizeOption,
  listSizeOptions,
} from "@/modules/catalog/application/sizes";
import { ConflictError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
const created = { accountIds: [] as string[], sizeIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

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
      email: `vitest-sizes-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITSZ-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Sizes",
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
  await prisma.sizeOption.deleteMany({ where: { id: { in: created.sizeIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("size library", () => {
  it("ships the seeded 5 to 30 range with ages, in numeric order", async () => {
    const sizes = await listSizeOptions();
    const labels = sizes.map((entry) => entry.label);

    expect(labels).toContain("5");
    expect(labels).toContain("30");
    expect(sizes.find((entry) => entry.label === "12")?.ageLabel).toContain("12");
    expect(labels.indexOf("9")).toBeLessThan(labels.indexOf("10"));
  });

  it("creates a size and rejects duplicates and empty ages", async () => {
    const size = await createSizeOption(staff, { label: "VIT-S", ageLabel: "6–7 سنة" });
    created.sizeIds.push(size.id);

    expect(size.label).toBe("VIT-S");

    await expect(createSizeOption(staff, { label: "VIT-S", ageLabel: "6–7 سنة" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(createSizeOption(staff, { label: "VIT-T", ageLabel: "" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses to delete a size a variant uses, then deletes it once free", async () => {
    const suffix = Date.now().toString(36);
    const category =
      (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
      (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
    const size = await createSizeOption(staff, { label: "VIT-USE", ageLabel: "8–9 سنة" });
    created.sizeIds.push(size.id);

    const product = await prisma.product.create({
      data: {
        name: `Vitest Size Use ${suffix}`,
        slug: `vitest-size-use-${suffix}`,
        status: "ACTIVE",
        basePrice: "40.00",
        currency: "SAR",
        categoryId: category.id,
        variants: { create: [{ sku: `VITSZ-U-${suffix.toUpperCase()}`, size: "VIT-USE", status: "ACTIVE" }] },
      },
      include: { variants: true },
    });
    created.productIds.push(product.id);
    created.variantIds.push(...product.variants.map((variant) => variant.id));

    await expect(deleteSizeOption(staff, size.id)).rejects.toBeInstanceOf(ConflictError);

    await prisma.productVariant.deleteMany({ where: { id: { in: product.variants.map((variant) => variant.id) } } });
    await prisma.product.delete({ where: { id: product.id } });
    const removed = await deleteSizeOption(staff, size.id);
    expect(removed.label).toBe("VIT-USE");
    created.sizeIds = created.sizeIds.filter((id) => id !== size.id);
  });
});
