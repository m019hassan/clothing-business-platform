import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import { countProducts, getProductInventory, listProducts } from "@/modules/catalog/application/products";
import type { ProductView } from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";

// Public catalog reads: sellable products only (ACTIVE product, not deleted,
// with at least one ACTIVE variant).

const created = {
  productIds: [] as string[],
  variantIds: [] as string[],
};
let baselineCount = 0;
let sellableA: { id: string; variantId: string };
let sellableB: { id: string };
let draftProduct: { id: string };
let noActiveVariants: { id: string };

async function createProduct(input: {
  name: string;
  slug: string;
  status: "ACTIVE" | "DRAFT";
  variants: { sku: string; status: "ACTIVE" | "DRAFT"; priceOverride?: string }[];
}) {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      status: input.status,
      basePrice: new Prisma.Decimal("120.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: {
        create: input.variants.map((variant) => ({
          sku: variant.sku,
          status: variant.status,
          priceOverride: variant.priceOverride ? new Prisma.Decimal(variant.priceOverride) : null,
        })),
      },
    },
    include: { variants: true },
  });

  created.productIds.push(product.id);
  for (const variant of product.variants) {
    created.variantIds.push(variant.id);
  }

  return product;
}

beforeAll(async () => {
  baselineCount = await countProducts();
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);

  const a = await createProduct({
    name: `Vitest Sellable ${suffix}`,
    slug: `vitest-sellable-${suffix}`,
    status: "ACTIVE",
    variants: [
      { sku: `VITP-A1-${suffix}`, status: "ACTIVE", priceOverride: "99.00" },
      { sku: `VITP-A2-${suffix}`, status: "ACTIVE" },
      { sku: `VITP-A3-${suffix}`, status: "DRAFT" },
    ],
  });
  const b = await createProduct({
    name: `Vitest Sellable NoStock ${suffix}`,
    slug: `vitest-sellable-b-${suffix}`,
    status: "ACTIVE",
    variants: [{ sku: `VITP-B1-${suffix}`, status: "ACTIVE" }],
  });
  const c = await createProduct({
    name: `Vitest Draft ${suffix}`,
    slug: `vitest-draft-${suffix}`,
    status: "DRAFT",
    variants: [{ sku: `VITP-C1-${suffix}`, status: "ACTIVE" }],
  });
  const d = await createProduct({
    name: `Vitest NoActiveVariants ${suffix}`,
    slug: `vitest-no-active-${suffix}`,
    status: "ACTIVE",
    variants: [{ sku: `VITP-D1-${suffix}`, status: "DRAFT" }],
  });

  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));

  const activeVariantA = a.variants.find((variant) => variant.sku.startsWith("VITP-A1"))!;
  await prisma.inventoryItem.create({
    data: { variantId: activeVariantA.id, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 2 },
  });

  sellableA = { id: a.id, variantId: activeVariantA.id };
  sellableB = { id: b.id };
  draftProduct = { id: c.id };
  noActiveVariants = { id: d.id };
});

afterAll(async () => {
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
});

describe("countProducts", () => {
  it("counts only sellable products (active product with an active variant)", async () => {
    const total = await countProducts();

    expect(total).toBe(baselineCount + 2);
  });
});

describe("listProducts", () => {
  it("paginates consistently and matches the total count", async () => {
    const total = await countProducts();
    const collected: ProductView[] = [];

    for (let offset = 0; offset < total; offset += 50) {
      const page = await listProducts({ limit: 50, offset });
      expect(page.length).toBeLessThanOrEqual(50);
      collected.push(...page);
    }

    expect(collected.length).toBe(total);
    expect(new Set(collected.map((product) => product.id)).size).toBe(total);
  });

  it("excludes draft products and products without active variants", async () => {
    const total = await countProducts();
    const ids = new Set<string>();

    for (let offset = 0; offset < total; offset += 50) {
      const page = await listProducts({ limit: 50, offset });
      page.forEach((product) => ids.add(product.id));
    }

    expect(ids.has(sellableA.id)).toBe(true);
    expect(ids.has(sellableB.id)).toBe(true);
    expect(ids.has(draftProduct.id)).toBe(false);
    expect(ids.has(noActiveVariants.id)).toBe(false);
  });

  it("maps active variants with availability and hides draft variants", async () => {
    const total = await countProducts();
    let found: ProductView | undefined;

    for (let offset = 0; offset < total && !found; offset += 50) {
      const page = await listProducts({ limit: 50, offset });
      found = page.find((product) => product.id === sellableA.id);
    }

    expect(found).toBeDefined();
    expect(found!.basePrice).toBe("120");
    expect(found!.categoryName).toBe("Vitest");
    expect(found!.variants).toHaveLength(2);

    const pricedVariant = found!.variants.find((variant) => variant.priceOverride !== null);
    expect(pricedVariant?.priceOverride).toBe("99");
    expect(found!.variants.some((variant) => variant.availableQuantity === 3)).toBe(true);
  });
});

describe("getProductInventory", () => {
  it("exposes raw counters for the management screen", async () => {
    const inventory = await getProductInventory(sellableA.id);

    expect(JSON.stringify(inventory)).not.toMatch(/passwordHash/);
    expect(inventory.variants.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects unknown ids", async () => {
    await expect(getProductInventory("not-a-uuid")).rejects.toMatchObject({ statusCode: 404 });
  });
});
