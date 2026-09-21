import "server-only";

import { Prisma, ProductStatus } from "@prisma/client";

import type {
  ProductInventoryView,
  ProductView,
} from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import { AuthorizationError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { hasPermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import {
  isUuid,
  parsePaginationParams,
  type Pagination,
} from "@/src/lib/validation";

export { parsePaginationParams };

const DEFAULT_PAGE_SIZE = 50;

export const productSelection = {
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

export type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelection }>;

const sellableProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  variants: { some: { status: ProductStatus.ACTIVE } },
} satisfies Prisma.ProductWhereInput;

export function mapProduct(product: ProductRecord): ProductView {
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

export const PRODUCT_SORTS = ["name", "name_desc", "price", "price_desc", "newest"] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export type ProductListFilters = {
  search?: string;
  categorySlug?: string;
  sort?: ProductSort;
  /** Staff-only: list one lifecycle status instead of the sellable catalog. */
  status?: ProductStatus;
};

export const PRODUCT_LIST_STATUSES: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

const MAX_SEARCH_LENGTH = 100;

function productOrderBy(sort: ProductSort = "name"): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "name_desc":
      return [{ name: "desc" }, { id: "desc" }];
    case "price":
      return [{ basePrice: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ basePrice: "desc" }, { id: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ name: "asc" }, { id: "asc" }];
  }
}

/**
 * Listing filters are optional and additive: an empty filter set reproduces the
 * original sellable catalog, so the count and the page always share one where clause.
 */
function buildProductWhere(filters: ProductListFilters): Prisma.ProductWhereInput {
  // A status filter is the management view: it shows exactly that status, so an
  // archived product without active variants stays reachable for staff.
  const where: Prisma.ProductWhereInput = filters.status
    ? { status: filters.status, deletedAt: null }
    : { ...sellableProductWhere };

  if (filters.search !== undefined) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.categorySlug !== undefined) {
    where.category = { slug: filters.categorySlug, isActive: true };
  }

  return where;
}

/**
 * Validates the optional catalog query parameters (search, category, sort) and the
 * staff-only status filter. `status` is rejected unless the caller checked the
 * catalog permission, so draft products can never leak through the public route.
 */
export function parseProductListFilters(
  searchParams: URLSearchParams,
  { allowStatus = false }: { allowStatus?: boolean } = {},
): ProductListFilters {
  const filters: ProductListFilters = {};

  const search = searchParams.get("q");

  if (search !== null) {
    const trimmed = search.trim();

    if (trimmed.length === 0 || trimmed.length > MAX_SEARCH_LENGTH) {
      throw new ValidationError(`q must be between 1 and ${MAX_SEARCH_LENGTH} characters.`);
    }

    filters.search = trimmed;
  }

  const category = searchParams.get("category");

  if (category !== null) {
    const trimmed = category.trim();

    if (trimmed.length === 0 || trimmed.length > MAX_SEARCH_LENGTH) {
      throw new ValidationError("category must be a category slug.");
    }

    filters.categorySlug = trimmed;
  }

  const status = searchParams.get("status");

  if (status !== null) {
    if (!allowStatus) {
      throw new AuthorizationError("Catalog access is required to filter by status.");
    }

    if (!PRODUCT_LIST_STATUSES.includes(status as ProductStatus)) {
      throw new ValidationError(`status must be one of: ${PRODUCT_LIST_STATUSES.join(", ")}.`);
    }

    filters.status = status as ProductStatus;
  }

  const sort = searchParams.get("sort");

  if (sort !== null) {
    if (!(PRODUCT_SORTS as readonly string[]).includes(sort)) {
      throw new ValidationError(`sort must be one of: ${PRODUCT_SORTS.join(", ")}.`);
    }

    filters.sort = sort as ProductSort;
  }

  return filters;
}

export async function listProducts(
  pagination: Pagination = { limit: DEFAULT_PAGE_SIZE, offset: 0 },
  filters: ProductListFilters = {},
): Promise<ProductView[]> {
  const products = await withDatabaseError(() =>
    prisma.product.findMany({
      where: buildProductWhere(filters),
      select: productSelection,
      orderBy: productOrderBy(filters.sort),
      take: pagination.limit,
      skip: pagination.offset,
    }),
  );

  return products.map(mapProduct);
}

/** True when the caller may see draft/archived products in listing filters. */
export async function canFilterByStatus(): Promise<boolean> {
  return hasPermission(PERMISSIONS.PRODUCTS_VIEW);
}

export async function countProducts(filters: ProductListFilters = {}): Promise<number> {
  return withDatabaseError(() => prisma.product.count({ where: buildProductWhere(filters) }));
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
        categoryId: true,
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
    categoryId: product.categoryId,
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
