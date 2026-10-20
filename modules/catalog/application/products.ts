import "server-only";

import { Prisma, ProductStatus } from "@prisma/client";

import type {
  ProductInventoryView,
  ProductView,
} from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import { colorLibraryIndex, normalizeColorKey } from "@/modules/catalog/application/colors";
import { discountedAmount, getActiveDiscountMap } from "@/modules/catalog/application/promotions";
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
  material: true,
  status: true,
  basePrice: true,
  cost: true,
  currency: true,
  category: { select: { name: true } },
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } },
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

export function mapProduct(
  product: ProductRecord,
  colorIndex?: Map<string, { hex: string; nameEn: string | null }>,
  options?: { includeCost?: boolean; discountPercent?: number | null },
): ProductView {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    material: product.material,
    status: product.status,
    basePrice: product.basePrice.toString(),
    currency: product.currency,
    ...(options?.includeCost ? { cost: product.cost?.toString() ?? null } : {}),
    ...(options?.discountPercent
      ? {
          discountPercent: options.discountPercent,
          salePrice: discountedAmount(product.basePrice, options.discountPercent).toString(),
        }
      : {}),
    categoryName: product.category?.name ?? null,
    imageId: product.images?.[0]?.id ?? null,
    imageIds: (product.images ?? []).map((image) => image.id),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.color
        ? (colorIndex?.get(normalizeColorKey(variant.color))?.hex ?? null)
        : null,
      colorNameEn: variant.color
        ? (colorIndex?.get(normalizeColorKey(variant.color))?.nameEn ?? null)
        : null,
      status: variant.status,
      priceOverride: variant.priceOverride ? variant.priceOverride.toString() : null,
      ...(options?.discountPercent
        ? {
            salePrice: discountedAmount(
              variant.priceOverride ?? product.basePrice,
              options.discountPercent,
            ).toString(),
          }
        : {}),
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

  const colorIndex = await colorLibraryIndex();

  const discountMap = await getActiveDiscountMap();

  return products.map((product) =>
    mapProduct(product, colorIndex, { discountPercent: discountMap.get(product.id) ?? null }),
  );
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

  const colorIndex = await colorLibraryIndex();

  const product = await withDatabaseError(() =>
    prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
  material: true,
        status: true,
        basePrice: true,
        cost: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        category: { select: { name: true } },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } },
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

  const discountMap = await getActiveDiscountMap();

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    material: product.material,
    status: product.status,
    basePrice: product.basePrice.toString(),
    currency: product.currency,
    cost: product.cost?.toString() ?? null,
    ...(discountMap.get(product.id)
      ? {
          discountPercent: discountMap.get(product.id),
          salePrice: discountedAmount(product.basePrice, discountMap.get(product.id)!).toString(),
        }
      : {}),
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    imageId: product.images?.[0]?.id ?? null,
    imageIds: (product.images ?? []).map((image) => image.id),
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
        colorHex: variant.color ? (colorIndex.get(normalizeColorKey(variant.color))?.hex ?? null) : null,
        colorNameEn: variant.color ? (colorIndex.get(normalizeColorKey(variant.color))?.nameEn ?? null) : null,
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

  const colorIndex = await colorLibraryIndex();

  const discountMap = await getActiveDiscountMap();

  return mapProduct(product, colorIndex, { discountPercent: discountMap.get(product.id) ?? null });
}

export type ProductBranchStockView = {
  storage: { totalAvailable: number; warehouses: { id: string; name: string; code: string; available: number }[] };
  branches: {
    branchId: string;
    branchName: string;
    branchCode: string;
    storeId: string | null;
    available: number;
  }[];
};

/** Where this product sits right now: storage totals and every branch store. */
export async function getProductBranchStock(productId: string): Promise<ProductBranchStockView> {
  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  return withDatabaseError(async () => {
    const [branches, balances] = await Promise.all([
      prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          warehouses: { where: { kind: "STORE" }, select: { id: true } },
        },
      }),
      prisma.inventoryItem.findMany({
        where: { variant: { productId }, warehouse: { isActive: true } },
        select: {
          warehouseId: true,
          quantityOnHand: true,
          quantityReserved: true,
          warehouse: { select: { id: true, code: true, name: true, kind: true, branchId: true } },
        },
      }),
    ]);

    const perWarehouse = new Map<
      string,
      { id: string; code: string; name: string; kind: "STORE" | "STORAGE"; branchId: string | null; available: number }
    >();

    for (const balance of balances) {
      const entry = perWarehouse.get(balance.warehouseId) ?? {
        id: balance.warehouse.id,
        code: balance.warehouse.code,
        name: balance.warehouse.name,
        kind: balance.warehouse.kind,
        branchId: balance.warehouse.branchId,
        available: 0,
      };

      entry.available += balance.quantityOnHand - balance.quantityReserved;
      perWarehouse.set(balance.warehouseId, entry);
    }

    const storage = [...perWarehouse.values()].filter((warehouse) => warehouse.kind !== "STORE");
    const storesByBranch = new Map<string, number>();

    for (const warehouse of perWarehouse.values()) {
      if (warehouse.kind === "STORE" && warehouse.branchId) {
        storesByBranch.set(warehouse.branchId, (storesByBranch.get(warehouse.branchId) ?? 0) + warehouse.available);
      }
    }

    return {
      storage: {
        totalAvailable: storage.reduce((sum, warehouse) => sum + warehouse.available, 0),
        warehouses: storage.map((warehouse) => ({
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          available: warehouse.available,
        })),
      },
      branches: branches.map((branch) => ({
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        storeId: branch.warehouses[0]?.id ?? null,
        available: storesByBranch.get(branch.id) ?? 0,
      })),
    };
  });
}

export type RelatedProductView = {
  id: string;
  name: string;
  basePrice: string;
  salePrice: string | null;
  discountPercent: number | null;
  currency: string;
  imageId: string | null;
};

/** Same-category picks for the "you may also like" shelf. */
export async function listRelatedProducts(productId: string, take = 4): Promise<RelatedProductView[]> {
  if (!isUuid(productId)) {
    return [];
  }

  return withDatabaseError(async () => {
    const base = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (base === null) {
      return [];
    }

    const [products, discountMap] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { not: productId },
          categoryId: base.categoryId,
          status: ProductStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          name: true,
          basePrice: true,
          currency: true,
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1, select: { id: true } },
        },
      }),
      getActiveDiscountMap(),
    ]);

    const picks =
      products.length > 0
        ? products
        : await prisma.product.findMany({
            where: { id: { not: productId }, status: ProductStatus.ACTIVE, deletedAt: null },
            orderBy: { createdAt: "desc" },
            take,
            select: {
              id: true,
              name: true,
              basePrice: true,
              currency: true,
              images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 1, select: { id: true } },
            },
          });

    return picks.map((product) => {
      const discountPercent = discountMap.get(product.id) ?? null;

      return {
        id: product.id,
        name: product.name,
        basePrice: product.basePrice.toString(),
        salePrice: discountPercent ? discountedAmount(product.basePrice, discountPercent).toString() : null,
        discountPercent,
        currency: product.currency,
        imageId: product.images[0]?.id ?? null,
      };
    });
  });
}
