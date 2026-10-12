import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import { getWarehouseDetails } from "@/modules/inventory/application/inventory";
import { prisma } from "@/src/lib/db";

let branchId: string;
let warehouseId: string;
const created = {
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
};

beforeEach(async () => {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `WHB-${suffix.toUpperCase()}`, name: `WH Branch ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `WHW-${suffix.toUpperCase()}`, name: `WH ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);
  warehouseId = warehouse.id;

  const product = await prisma.product.create({
    data: {
      name: `WH Product ${suffix}`,
      slug: `wh-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("10.00"),
      currency: "EGP",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `WH-A-${suffix}`, size: "M", status: "ACTIVE" },
          { sku: `WH-B-${suffix}`, size: "L", status: "ACTIVE" },
        ],
      },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id, product.variants[1].id);

  await prisma.inventoryItem.createMany({
    data: [
      { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 3, quantityReserved: 0 },
      { variantId: product.variants[1].id, warehouseId: warehouse.id, quantityOnHand: 7, quantityReserved: 2 },
    ],
  });
});

afterAll(async () => {
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("warehouse details", () => {
  it("lists everything the warehouse holds with totals", async () => {
    const details = await getWarehouseDetails(warehouseId, {
      branchId,
      warehouseIds: [warehouseId],
      branchLabel: null,
    });

    expect(details.warehouse.code).toContain("WHW-");
    expect(details.rows).toHaveLength(2);
    expect(details.summary.variants).toBe(2);
    expect(details.summary.products).toBe(1);
    expect(details.summary.onHand).toBe(10);
    expect(details.summary.available).toBe(8);
    expect(details.rows[0].sku).toContain("WH-A-");
  });

  it("hides warehouses outside the caller scope", async () => {
    await expect(
      getWarehouseDetails(warehouseId, {
        branchId: "00000000-0000-4000-8000-000000000000",
        warehouseIds: ["00000000-0000-4000-8000-000000000000"],
        branchLabel: null,
      }),
    ).rejects.toThrowError();
  });
});
