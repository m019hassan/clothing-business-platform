import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import { runLowStockSweep } from "@/modules/notification/application/low-stock";
import { prisma } from "@/src/lib/db";

let branchId: string;
let employeeAccountId: string;
let lowVariantId: string;
let okVariantId: string;
const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  roleIds: [] as string[],
};

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const permission =
    (await prisma.permission.findFirst({ where: { code: "inventory.view" } })) ??
    (await prisma.permission.create({ data: { code: "inventory.view", name: "View inventory", module: "inventory" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `LSB-${suffix.toUpperCase()}`, name: `Low Stock ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { kind: "STORE", code: `LSW-${suffix.toUpperCase()}`, name: `Low Stock WH ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);

  const product = await prisma.product.create({
    data: {
      name: `Sweep ${suffix}`,
      slug: `sweep-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("20.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `SW-LOW-${suffix}`, size: "S", status: "ACTIVE" },
          { sku: `SW-OK-${suffix}`, size: "M", status: "ACTIVE" },
        ],
      },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id, product.variants[1].id);
  lowVariantId = product.variants[0].id;
  okVariantId = product.variants[1].id;

  await prisma.inventoryItem.createMany({
    data: [
      { variantId: lowVariantId, warehouseId: warehouse.id, quantityOnHand: 3, quantityReserved: 0 },
      { variantId: okVariantId, warehouseId: warehouse.id, quantityOnHand: 50, quantityReserved: 0 },
    ],
  });

  const role = await prisma.role.create({
    data: { code: `LSR-${suffix.toUpperCase()}`, name: `Low Stock Role ${suffix}`, isActive: true },
  });
  created.roleIds.push(role.id);
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });

  const employee = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-lowstock-${suffix}@example.com`,
      phone: `+2011${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `E-${suffix.toUpperCase()}`,
          departmentId: department.id,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Ops",
        },
      },
    },
    include: { employeeProfile: true },
  });
  created.accountIds.push(employee.id);
  employeeAccountId = employee.id;
  await prisma.employeeRole.create({ data: { employeeId: employee.employeeProfile!.id, roleId: role.id } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.employeeRole.deleteMany({ where: { employee: { accountId: { in: created.accountIds } } } });
  await prisma.rolePermission.deleteMany({ where: { roleId: { in: created.roleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: created.roleIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("low-stock sweep", () => {
  it("notifies branch holders about low variants, once, and skips healthy stock", async () => {
    const first = await runLowStockSweep({ branchIds: [branchId] });

    expect(first.lowVariants).toBe(1);
    expect(first.notificationsCreated).toBe(1);

    const lowAlert = await prisma.notification.findFirst({
      where: { accountId: employeeAccountId, entityType: "ProductVariant", entityId: lowVariantId },
    });
    const healthyAlert = await prisma.notification.findFirst({
      where: { accountId: employeeAccountId, entityType: "ProductVariant", entityId: okVariantId },
    });

    expect(lowAlert).not.toBeNull();
    expect(lowAlert?.readAt).toBeNull();
    expect(healthyAlert).toBeNull();

    const second = await runLowStockSweep({ branchIds: [branchId] });

    expect(second.notificationsCreated).toBe(0);
  });
});
