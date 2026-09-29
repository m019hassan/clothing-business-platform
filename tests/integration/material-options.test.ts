import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createMaterialOption,
  deleteMaterialOption,
  listMaterialOptions,
} from "@/modules/catalog/application/materials";
import { ConflictError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
const created = { accountIds: [] as string[], materialIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

beforeEach(async () => {
  vi.mocked(requirePermission).mockResolvedValue(undefined);
  // leftovers from an aborted run must not break the duplicate-name assertions
  await prisma.materialOption.deleteMany({ where: { name: { startsWith: "VIT" } } });

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
  await prisma.sizeOption.deleteMany({ where: { id: { in: created.materialIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("material library", () => {
  it("ships the seeded cotton, leather, linen, melton and velvet", async () => {
    const names = (await listMaterialOptions()).map((entry) => entry.name);

    expect(names).toContain("قطن");
    expect(names).toContain("جلد");
    expect(names).toContain("كتان");
    expect(names).toContain("ملتون");
    expect(names).toContain("قطيفة");
  });

  it("creates a material and rejects duplicates and empty names", async () => {
    const material = await createMaterialOption(staff, { name: "VIT خامة" });
    created.materialIds.push(material.id);

    expect(material.name).toBe("VIT خامة");

    await expect(createMaterialOption(staff, { name: "VIT خامة" })).rejects.toBeInstanceOf(ConflictError);
    await expect(createMaterialOption(staff, { name: "" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses to delete a material a product uses, then deletes it once free", async () => {
    const suffix = Date.now().toString(36);
    const category =
      (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
      (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
    const material = await createMaterialOption(staff, { name: "VIT-USE材质" });
    created.materialIds.push(material.id);

    const product = await prisma.product.create({
      data: {
        name: `Vitest Material Use ${suffix}`,
        slug: `vitest-material-use-${suffix}`,
        status: "ACTIVE",
        basePrice: "40.00",
        currency: "SAR",
        material: "VIT-USE材质",
        categoryId: category.id,
      },
      include: { variants: true },
    });
    created.productIds.push(product.id);
    created.variantIds.push(...product.variants.map((variant) => variant.id));

    await expect(deleteMaterialOption(staff, material.id)).rejects.toBeInstanceOf(ConflictError);

    await prisma.product.delete({ where: { id: product.id } });
    const removed = await deleteMaterialOption(staff, material.id);
    expect(removed.name).toBe("VIT-USE材质");
    created.materialIds = created.materialIds.filter((id) => id !== material.id);
  });
});
