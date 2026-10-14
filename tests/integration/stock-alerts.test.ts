import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import { createStockAlert } from "@/modules/inventory/application/stock-alerts";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError } from "@/src/lib/errors";

let variantId: string;
let keeperId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  roleIds: [] as string[],
  alertIds: [] as string[],
};

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const permission =
    (await prisma.permission.findFirst({ where: { code: "inventory.adjust" } })) ??
    (await prisma.permission.create({ data: { code: "inventory.adjust", name: "Adjust inventory", module: "inventory" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const product = await prisma.product.create({
    data: {
      name: `SA Product ${suffix}`,
      slug: `sa-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("99.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: { create: [{ sku: `SA-${suffix}`, size: "L", color: "أسود", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;

  const role = await prisma.role.create({
    data: { code: `SAR-${suffix.toUpperCase()}`, name: `Keeper ${suffix}`, isActive: true },
  });
  created.roleIds.push(role.id);
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

  const keeper = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-sa-keeper-${suffix}@example.com`,
      phone: `+2016${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `SAK-${suffix.toUpperCase()}`,
          departmentId: department.id,
          branchId: null,
          firstName: "Vitest",
          lastName: "Keeper",
        },
      },
    },
    include: { employeeProfile: true },
  });
  created.accountIds.push(keeper.id);
  await prisma.employeeRole.create({ data: { employeeId: keeper.employeeProfile!.id, roleId: role.id } });
  keeperId = keeper.id;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { entityType: "StockAlert", entityId: { in: created.alertIds } } });
  await prisma.stockAlert.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.employeeRole.deleteMany({ where: { employee: { accountId: { in: created.accountIds } } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("stock alerts", () => {
  it("stores a pending alert and pings the warehouse in Arabic", async () => {
    const result = await createStockAlert({ variantId, contact: "  Customer@Example.com " }, "ar");

    expect(result.created).toBe(true);
    created.alertIds.push(result.id);

    const row = await prisma.stockAlert.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.status).toBe("PENDING");
    expect(row.contact).toBe("customer@example.com");

    const ping = await prisma.notification.findFirst({
      where: { accountId: keeperId, entityType: "StockAlert", entityId: result.id },
    });
    expect(ping).not.toBeNull();
    expect(ping!.title).toContain("عميل مستني");
  });

  it("keeps one alert per contact even when they ask again", async () => {
    const first = await createStockAlert({ variantId, contact: "0770123456" }, "en");
    created.alertIds.push(first.id);

    const again = await createStockAlert({ variantId, contact: "0770123456" }, "en");

    expect(again.created).toBe(false);
    expect(again.id).toBe(first.id);

    const rows = await prisma.stockAlert.findMany({ where: { variantId } });
    expect(rows).toHaveLength(1);

    const ping = await prisma.notification.findFirst({
      where: { accountId: keeperId, entityType: "StockAlert", entityId: first.id },
    });
    expect(ping!.title).toContain("A customer is waiting");
  });

  it("rejects a contact that is neither an email nor a phone", async () => {
    await expect(createStockAlert({ variantId, contact: "hello" }, "en")).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses an unknown variant", async () => {
    await expect(
      createStockAlert({ variantId: "00000000-0000-4000-8000-000000000000", contact: "a@b.com" }, "en"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
