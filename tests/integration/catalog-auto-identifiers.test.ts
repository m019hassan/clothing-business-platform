import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createCategory } from "@/modules/catalog/application/categories";
import { createProduct, createVariant } from "@/modules/catalog/application/product-management";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let categoryId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  categoryIds: [] as string[],
};

beforeEach(async () => {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-auto-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITAUTO-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Catalog",
        },
      },
    },
    include: { employeeProfile: true },
  });

  created.accountIds.push(staffRecord.id);
  categoryId = category.id;

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
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.category.deleteMany({ where: { id: { in: created.categoryIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("automatic catalog identifiers", () => {
  it("derives a product slug from a Latin name and accepts an Arabic one", async () => {
    const suffix = Date.now().toString(36);

    const latin = await createProduct(staff, {
      name: `Linen Shirt ${suffix}`,
      basePrice: "149.00",
      categoryId,
    });
    created.productIds.push(latin.id);

    expect(latin.slug).toBe(`linen-shirting-${suffix}`.replace("shirting", "shirt").toLowerCase());

    // A name made only of Arabic letters has nothing the platform can slugify,
    // so it falls back to a generated token.
    const arabic = await createProduct(staff, {
      name: "تيشيرت رجالي فاخر",
      basePrice: "99.00",
      categoryId,
    });
    created.productIds.push(arabic.id);

    expect(arabic.slug).toMatch(/^product-[0-9a-f]{6}$/);
  });

  it("rejects a slug that is already used and names it", async () => {
    const suffix = Date.now().toString(36);

    const first = await createProduct(staff, {
      name: `Hoodie ${suffix}`,
      slug: `hoodie-${suffix}`,
      basePrice: "199.00",
      categoryId,
    });
    created.productIds.push(first.id);

    await expect(
      createProduct(staff, {
        name: `Another hoodie ${suffix}`,
        slug: `hoodie-${suffix}`,
        basePrice: "199.00",
        categoryId,
      }),
    ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining(`hoodie-${suffix}`) });
  });

  it("generates a variant SKU when none is given and keeps a typed one", async () => {
    const suffix = Date.now().toString(36);

    const product = await createProduct(staff, {
      name: `Cap ${suffix}`,
      basePrice: "59.00",
      categoryId,
    });
    created.productIds.push(product.id);

    const generated = await createVariant(staff, product.id, { size: "M" });
    const generatedVariant = generated.variants.find((variant) => variant.size === "M");
    created.variantIds.push(generatedVariant!.id);
    expect(generatedVariant!.sku).toMatch(/^VAR-[0-9A-F]{6}$/);

    const typed = await createVariant(staff, product.id, { sku: `CAP-${suffix.toUpperCase().slice(0, 6)}` });
    const typedVariant = typed.variants.find((variant) => variant.sku.startsWith("CAP-"));
    created.variantIds.push(typedVariant!.id);
    expect(typedVariant!.sku.startsWith("CAP-")).toBe(true);
  });

  it("generates a category slug from an Arabic name", async () => {
    const category = await createCategory(staff, { name: "أحذية رياضية" });
    created.categoryIds.push(category.id);

    expect(category.slug).toMatch(/^category-[0-9a-f]{6}$/);
  });

  it("keeps a typed category slug and refuses a duplicate", async () => {
    const suffix = Date.now().toString(36);

    const first = await createCategory(staff, { name: `Socks ${suffix}`, slug: `socks-${suffix}` });
    created.categoryIds.push(first.id);
    expect(first.slug).toBe(`socks-${suffix}`);

    await expect(createCategory(staff, { name: `Socks again ${suffix}`, slug: `socks-${suffix}` })).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
