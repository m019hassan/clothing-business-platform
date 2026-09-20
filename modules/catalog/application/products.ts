import "server-only";

import { Prisma, ProductStatus } from "@prisma/client";

import type {
  ProductInventoryView,
  ProductView,
} from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import { NotFoundError, withDatabaseError } from "@/src/lib/errors";
import {
  isUuid,
  parsePaginationParams,
  type Pagination,
} from "@/src/lib/validation";

export { parsePaginationParams };

const DEFAULT_PAGE_SIZE = 50;

const productSelection = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  basePrice: true,
  currency: true,
  category: { select: { name: true } },
  variants: {
    where: { status: ProductStatus.ACTIVE },
    orderBy: { sku: "asc" },
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      status: true,
      priceOverride: true,
      inventoryItems: {
        select: { quantityOnHand: true, quantityReserved: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelection }>;

const sellableProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  variants: { some: { status: ProductStatus.ACTIVE } },
} satisfies Prisma.ProductWhereInput;

function mapProduct(product: ProductRecord): ProductView {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    basePrice: product.basePrice.toString(),
    currency: product.currency,
    categoryName: product.category?.name ?? null,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      status: variant.status,
      priceOverride: variant.priceOverride ? variant.priceOverride.toString() : null,
      availableQuantity: variant.inventoryItems.reduce(
        (sum, item) => sum + item.quantityOnHand - item.quantityReserved,
        0,
      ),
    })),
  };
}

export async function listProducts(
  pagination: Pagination = { limit: DEFAULT_PAGE_SIZE, offset: 0 },
): Promise<ProductView[]> {
  const products = await withDatabaseError(() =>
    prisma.product.findMany({
      where: sellableProductWhere,
      select: productSelection,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: pagination.limit,
      skip: pagination.offset,
    }),
  );

  return products.map(mapProduct);
}

/**
 * Management read used by the authenticated product screen.
 * It intentionally exposes raw inventory counters and includes every variant
 * (including draft/archived ones), so it must NOT be used by public API routes.
 */
export async function getProductInventory(
  productId: string,
): Promise<ProductInventoryView> {
  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const product = await withDatabaseError(() =>
    prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        basePrice: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        variants: {
          orderBy: { sku: "asc" },
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            status: true,
            priceOverride: true,
            inventoryItems: {
              select: { quantityOnHand: true, quantityReserved: true },
            },
          },
        },
      },
    }),
  );

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    basePrice: product.basePrice.toString(),
    currency: product.currency,
    categoryName: product.category?.name ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map((variant) => {
      const quantityOnHand = variant.inventoryItems.reduce(
        (sum, item) => sum + item.quantityOnHand,
        0,
      );
      const quantityReserved = variant.inventoryItems.reduce(
        (sum, item) => sum + item.quantityReserved,
        0,
      );

      return {
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        status: variant.status,
        priceOverride: variant.priceOverride ? variant.priceOverride.toString() : null,
        quantityOnHand,
        quantityReserved,
        availableQuantity: quantityOnHand - quantityReserved,
      };
    }),
  };
}

export async function getProduct(productId: string): Promise<ProductView> {
  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const product = await withDatabaseError(() =>
    prisma.product.findFirst({
      where: { ...sellableProductWhere, id: productId },
      select: productSelection,
    }),
  );

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  return mapProduct(product);
}
