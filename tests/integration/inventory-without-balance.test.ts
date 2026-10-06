import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { listVariantsWithoutBalances } from "@/modules/inventory/application/inventory";
import { adjustStock } from "@/modules/inventory/application/movements";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let variantId: string;
let warehouseId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
};

beforeEach(async () => {
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-nobalance-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITNB-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Stock",
        },
      },
    },
    include: { employeeProfile: true },
  });
  const product = await prisma.product.create({
    data: {
      name: `Vitest No Balance ${suffix}`,
      slug: `vitest-no-balance-${suffix}`,
      status: "ACTIVE",
      basePrice: "70.00",
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITNB-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });

  created.accountIds.push(staffRecord.id);
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;
  warehouseId = warehouse.id;

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
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("variants without a balance row", () => {
  it("lists an active variant that has no inventory row and drops it once stocked", async () => {
    const before = await listVariantsWithoutBalances(200);
    expect(before.some((variant) => variant.variantId === variantId)).toBe(true);
    expect(before.find((variant) => variant.variantId === variantId)?.productName).toContain("Vitest No Balance");

    // The documented flow: the first adjustment creates the row.
    await adjustStock(staff, { variantId, warehouseId, quantityChange: 12, reason: "first stock" });

    const after = await listVariantsWithoutBalances(200);
    expect(after.some((variant) => variant.variantId === variantId)).toBe(false);

    const item = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });
    expect(item.quantityOnHand).toBe(12);
  });

  it("creates the row without an explicit warehouse by resolving the default", async () => {
    await adjustStock(staff, { variantId, quantityChange: 5, reason: "default warehouse" });

    const item = await prisma.inventoryItem.findFirstOrThrow({ where: { variantId } });
    expect(item.quantityOnHand).toBe(5);
    expect(item.warehouseId).toBe(warehouseId);
  });
});
