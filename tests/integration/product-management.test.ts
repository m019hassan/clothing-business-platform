import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The permission gate itself is verified over HTTP with a real session; here the
// gate is stubbed so the management flows can be exercised against the database.
vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  archiveProduct,
  archiveVariant,
  createProduct,
  createVariant,
  updateProduct,
  updateVariant,
} from "@/modules/catalog/application/product-management";
import { countProducts, getProductInventory, listProducts } from "@/modules/catalog/application/products";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const account = {
  id: "00000000-0000-4000-8000-00000000cafe",
  accountType: "EMPLOYEE",
} as TestAccount;

let categoryId: string;
let otherCategoryId: string;
let suffix: string;
const created = { productIds: [] as string[], variantIds: [] as string[] };

beforeEach(async () => {
  suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);

  const main = await prisma.category.upsert({
    where: { slug: "vitest" },
    create: { name: "Vitest", slug: "vitest" },
    update: {},
    select: { id: true },
  });
  const other = await prisma.category.create({
    data: { name: `Vitest Other ${suffix}`, slug: `vitest-other-${suffix}` },
    select: { id: true },
  });

  categoryId = main.id;
  otherCategoryId = other.id;
});

afterAll(async () => {
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { productId: { in: created.productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  // Only drop fixture categories that no product references (earlier runs may
  // have crashed mid-test and left products behind).
  await prisma.category.deleteMany({
    where: { slug: { startsWith: "vitest-other-" }, products: { none: {} } },
  });
});

async function track(productId: string) {
  created.productIds.push(productId);

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  created.variantIds.push(...variants.map((variant) => variant.id));
}

let payloadCall = 0;

/** Every call gets fresh SKUs so a second product never collides by accident. */
function payload(overrides: Record<string, unknown> = {}) {
  payloadCall += 1;
  const token = `${suffix}-${payloadCall}`;

  return {
    name: `Vitest Shirt ${token}`,
    slug: `vitest-shirt-${token}`,
    description: "Test product",
    status: "ACTIVE",
    basePrice: "120.00",
    categoryId,
    variants: [
      { sku: `VITS-M-${token}`, size: "M", color: "Blue", status: "ACTIVE", priceOverride: "110.00" },
      { sku: `VITS-L-${token}`, size: "L", color: "Blue" },
    ],
    ...overrides,
  };
}

describe("createProduct", () => {
  it("creates a product with variants and returns the management view", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    expect(product.slug).toBe(product.slug);
    expect(product.slug).toContain(`vitest-shirt-`);
    expect(product.basePrice).toBe("120");
    expect(product.currency).toBe("SAR");
    expect(product.status).toBe("ACTIVE");
    expect(product.categoryName).toBe("Vitest");
    expect(product.variants).toHaveLength(2);

    const override = product.variants.find((variant) => variant.priceOverride !== null);
    expect(override?.priceOverride).toBe("110");
    expect(product.variants.every((variant) => variant.availableQuantity === 0)).toBe(true);
  });

  it("rejects a duplicate slug with a conflict", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    await expect(
      createProduct(account, payload({ name: "Another", slug: product.slug })),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects a duplicate SKU across products with a conflict", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    const existingSku = product.variants[0].sku;

    await expect(
      createProduct(
        account,
        payload({
          slug: `vitest-shirt-dupe-${suffix}`,
          variants: [{ sku: existingSku, status: "ACTIVE" }],
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("rejects an unknown category and invalid fields", async () => {
    await expect(
      createProduct(account, payload({ categoryId: "00000000-0000-4000-8000-000000000000" })),
    ).rejects.toMatchObject({ statusCode: 404 });

    await expect(createProduct(account, { name: "No slug" })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("updateProduct", () => {
  it("updates only the provided fields", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    const updated = await updateProduct(account, product.id, {
      name: "Renamed shirt",
      status: "DRAFT",
      basePrice: 99.5,
    });

    expect(updated.name).toBe("Renamed shirt");
    expect(updated.status).toBe("DRAFT");
    expect(updated.basePrice).toBe("99.5");
    expect(updated.slug).toContain("vitest-shirt-");
  });

  it("rejects unknown ids, empty payloads and slug conflicts", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    await expect(
      updateProduct(account, "00000000-0000-4000-8000-000000000000", { name: "Ghost" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateProduct(account, "not-a-uuid", { name: "Ghost" })).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(updateProduct(account, product.id, {})).rejects.toMatchObject({ statusCode: 400 });

    const second = await createProduct(account, payload());
    await track(second.id);

    await expect(
      updateProduct(account, second.id, { slug: product.slug }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("archiveProduct", () => {
  it("hides the product from the catalog but keeps the row", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    const archived = await archiveProduct(account, product.id);
    expect(archived.status).toBe("ARCHIVED");

    const listed = await listProducts({ limit: 100, offset: 0 }, { search: product.slug });
    expect(listed).toHaveLength(0);

    const stillThere = await getProductInventory(product.id);
    expect(stillThere.status).toBe("ARCHIVED");

    await expect(archiveProduct(account, product.id)).resolves.toMatchObject({ status: "ARCHIVED" });
  });
});

describe("variants", () => {
  it("creates, updates and archives a variant", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    const added = await createVariant(account, product.id, {
      sku: `VITS-XL-${suffix}-${payloadCall}`,
      size: "XL",
      status: "ACTIVE",
    });
    const createdVariant = added.variants.find((variant) => variant.sku === `VITS-XL-${suffix}-${payloadCall}`);
    expect(createdVariant).toBeDefined();

    const updated = await updateVariant(account, product.id, createdVariant!.id, {
      priceOverride: "95.00",
      color: "Green",
    });
    const updatedVariant = updated.variants.find((variant) => variant.id === createdVariant!.id);
    expect(updatedVariant?.priceOverride).toBe("95");
    expect(updatedVariant?.color).toBe("Green");

    const archived = await archiveVariant(account, product.id, createdVariant!.id);
    expect(archived.variants.find((variant) => variant.id === createdVariant!.id)?.status).toBe("ARCHIVED");
  });

  it("rejects a variant that belongs to another product", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);
    const other = await createProduct(account, payload());
    await track(other.id);

    const foreignVariant = other.variants[0];
    await expect(
      updateVariant(account, product.id, foreignVariant.id, { color: "Red" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects duplicate SKUs", async () => {
    const product = await createProduct(account, payload());
    await track(product.id);

    await expect(
      createVariant(account, product.id, { sku: product.variants[0].sku }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("catalog filters", () => {
  it("filters by search, category and sort while keeping total consistent", async () => {
    const first = await createProduct(account, payload({ name: `Vitest AAA ${suffix}`, slug: `vitest-aaa-${suffix}`, basePrice: "10.00" }));
    const second = await createProduct(account, payload({ name: `Vitest BBB ${suffix}`, slug: `vitest-bbb-${suffix}`, basePrice: "30.00" }));
    const third = await createProduct(
      account,
      payload({ name: `Vitest CCC ${suffix}`, slug: `vitest-ccc-${suffix}`, basePrice: "20.00", categoryId: otherCategoryId }),
    );
    await Promise.all([track(first.id), track(second.id), track(third.id)]);

    const now = Date.now();
    await prisma.product.update({ where: { id: first.id }, data: { createdAt: new Date(now - 3 * 3600_000) } });
    await prisma.product.update({ where: { id: second.id }, data: { createdAt: new Date(now - 2 * 3600_000) } });
    await prisma.product.update({ where: { id: third.id }, data: { createdAt: new Date(now - 3600_000) } });

    const filters = { search: suffix };
    const searched = await listProducts({ limit: 100, offset: 0 }, filters);
    expect(searched).toHaveLength(3);
    expect(await countProducts(filters)).toBe(3);

    const priced = await listProducts({ limit: 100, offset: 0 }, { search: suffix, sort: "price" });
    expect(priced.map((product) => product.basePrice)).toEqual(["10", "20", "30"]);

    const reversed = await listProducts({ limit: 100, offset: 0 }, { search: suffix, sort: "price_desc" });
    expect(reversed.map((product) => product.basePrice)).toEqual(["30", "20", "10"]);

    const newest = await listProducts({ limit: 100, offset: 0 }, { search: suffix, sort: "newest" });
    expect(newest.map((product) => product.id)).toEqual([third.id, second.id, first.id]);

    const byCategory = await listProducts({ limit: 100, offset: 0 }, { search: suffix, categorySlug: `vitest-other-${suffix}` });
    expect(byCategory.map((product) => product.id)).toEqual([third.id]);
    expect(await countProducts({ search: suffix, categorySlug: `vitest-other-${suffix}` })).toBe(1);

    const paged = await listProducts({ limit: 1, offset: 1 }, { search: suffix, sort: "price" });
    expect(paged).toHaveLength(1);
    expect(paged[0].basePrice).toBe("20");
  });
});
