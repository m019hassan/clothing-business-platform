import "server-only";

import { Prisma, ProductStatus } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { getProductInventory } from "@/modules/catalog/application/products";
import type { ProductInventoryView } from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, normalizeDigits } from "@/src/lib/validation";
import { autoSlug, autoSku } from "@/modules/catalog/application/identifiers";
import { applyOpeningBalance } from "@/modules/inventory/application/opening-balance";
import { resolveStockingWarehouseId } from "@/modules/inventory/application/movements";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_NAME = 150;
const MAX_SLUG = 150;
const MAX_DESCRIPTION = 5000;
const MAX_SKU = 50;
const MAX_ATTRIBUTE = 50;
const MAX_PRICE = "9999999999.99";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;
const SUPPORTED_CURRENCIES = ["SAR"];
const PRODUCT_STATUSES: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

export type ProductWriteInput = {
  material?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  status?: ProductStatus;
  basePrice?: string;
  currency?: string;
  categoryId?: string;
  variants?: VariantWriteInput[];
};

export type VariantWriteInput = {
  sku?: string;
  size?: string | null;
  color?: string | null;
  priceOverride?: string | null;
  status?: ProductStatus;
  quantity?: number;
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseRequiredString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

/** The field a unique-constraint violation was about, when Prisma reports it. */
function uniqueFieldOf(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }

  const target = (error.meta as { target?: unknown } | undefined)?.target;

  if (Array.isArray(target) && typeof target[0] === "string") {
    return target[0];
  }

  return typeof target === "string" ? target : null;
}

function parseSlug(value: unknown): string {
  const slug = parseRequiredString(value, "slug", MAX_SLUG).toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    throw new ValidationError("slug must use lowercase letters, digits and single hyphens.");
  }

  return slug;
}

function parseSku(value: unknown): string {
  const sku = parseRequiredString(value, "sku", MAX_SKU);

  if (!SKU_PATTERN.test(sku)) {
    throw new ValidationError("sku may only contain letters, digits, dots, dashes and underscores.");
  }

  return sku;
}

function parseMoney(value: unknown, field: string): string {
  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? normalizeDigits(value).trim()
        : "";

  if (raw === "" || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new ValidationError(`${field} must be an amount with up to two decimals.`);
  }

  const amount = new Prisma.Decimal(raw);

  if (amount.greaterThan(new Prisma.Decimal(MAX_PRICE))) {
    throw new ValidationError(`${field} is too large.`);
  }

  return amount.toFixed(2);
}

function parseStatus(value: unknown, field = "status"): ProductStatus {
  if (typeof value !== "string" || !PRODUCT_STATUSES.includes(value as ProductStatus)) {
    throw new ValidationError(`${field} must be one of: ${PRODUCT_STATUSES.join(", ")}.`);
  }

  return value as ProductStatus;
}

function parseDescription(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError("description must be a string or null.");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_DESCRIPTION) {
    throw new ValidationError(`description must be at most ${MAX_DESCRIPTION} characters.`);
  }

  return trimmed;
}

function parseAttribute(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string or null.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_ATTRIBUTE) {
    throw new ValidationError(`${field} must be at most ${MAX_ATTRIBUTE} characters.`);
  }

  return trimmed;
}

function parseCurrency(value: unknown): string {
  if (typeof value !== "string" || !SUPPORTED_CURRENCIES.includes(value.trim().toUpperCase())) {
    throw new ValidationError(`currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.`);
  }

  return value.trim().toUpperCase();
}

function parseCategoryId(value: unknown): string {
  if (typeof value !== "string" || !isUuid(value)) {
    throw new ValidationError("categoryId must be a category id.");
  }

  return value;
}

/** Validates a product create/update payload. Unknown keys are rejected. */
export function parseProductWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): ProductWriteInput {
  const body = asRecord(payload);
  const allowed = [
    "name",
    "slug",
    "description",
    "status",
    "basePrice",
    "currency",
    "categoryId",
    "material",
    "variants",
  ];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: ProductWriteInput = {};

  if (body.name !== undefined) {
    input.name = parseRequiredString(body.name, "name", MAX_NAME);
  } else if (!partial) {
    throw new ValidationError("name is required.");
  }

  if (body.slug !== undefined && body.slug !== null && String(body.slug).trim() !== "") {
    input.slug = parseSlug(body.slug);
  } else if (!partial) {
    // The slug is optional: a missing one is generated from the name below.
  }

  if (body.description !== undefined) {
    input.description = parseDescription(body.description);
  }

  if (body.status !== undefined) {
    input.status = parseStatus(body.status);
  }

  if (body.basePrice !== undefined) {
    input.basePrice = parseMoney(body.basePrice, "basePrice");
  } else if (!partial) {
    throw new ValidationError("basePrice is required.");
  }

  if (body.currency !== undefined) {
    input.currency = parseCurrency(body.currency);
  }

  if (body.categoryId !== undefined) {
    input.categoryId = parseCategoryId(body.categoryId);
  } else if (!partial) {
    throw new ValidationError("categoryId is required.");
  }

  if (body.material !== undefined) {
    input.material =
      body.material === null ? null : parseAttribute(body.material, "material");
  }

  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants)) {
      throw new ValidationError("variants must be an array.");
    }

    input.variants = body.variants.map((variant) => parseVariantWriteInput(variant, { partial: false }));
  }

  if (partial && Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

export function parseVariantWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): VariantWriteInput {
  const body = asRecord(payload);
  const allowed = ["sku", "size", "color", "priceOverride", "status", "quantity"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: VariantWriteInput = {};

  if (body.sku !== undefined) {
    input.sku = parseSku(body.sku);
  } else if (partial) {
    // Partial updates leave the SKU alone.
  } else if (!partial) {
    // An empty SKU is fine: createVariant generates one below.
  }

  if (body.size !== undefined) {
    input.size = parseAttribute(body.size, "size");
  }

  if (body.color !== undefined) {
    input.color = parseAttribute(body.color, "color");
  }

  if (body.priceOverride !== undefined) {
    input.priceOverride = body.priceOverride === null ? null : parseMoney(body.priceOverride, "priceOverride");
  }

  if (body.status !== undefined) {
    input.status = parseStatus(body.status);
  }

  if (body.quantity !== undefined) {
    // Opening stock belongs to creation; later stock goes through the ledger screen.
    if (partial) {
      throw new ValidationError("quantity can only be set when a variant is created.");
    }

    const quantity = Number(
      typeof body.quantity === "string" ? normalizeDigits(body.quantity).trim() : body.quantity,
    );

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) {
      throw new ValidationError("quantity must be a whole number between 0 and 1000000.");
    }

    input.quantity = quantity;
  }

  if (partial && Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

function conflictFrom(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError(message);
  }

  throw error;
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await withDatabaseError(() =>
    prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }),
  );

  if (!category) {
    throw new NotFoundError("Category not found.");
  }
}

async function assertProductExists(productId: string): Promise<void> {
  const product = await withDatabaseError(() =>
    prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true } }),
  );

  if (!product) {
    throw new NotFoundError("Product not found.");
  }
}

async function assertVariantBelongsToProduct(variantId: string, productId: string): Promise<void> {
  const variant = await withDatabaseError(() =>
    prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } }),
  );

  if (!variant) {
    throw new NotFoundError("Variant not found.");
  }
}

export async function createProduct(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);
  const input = parseProductWriteInput(payload, { partial: false });
  await assertCategoryExists(input.categoryId!);

  // With no slug the service generates one (from the name when it is Latin,
  // otherwise a short token) and retries a few times if the token clashes.
  const providedSlug = input.slug;
  const maxAttempts = providedSlug ? 1 : 5;

  // Stock entered with the product is written through the ledger inside the same
  // transaction, so a product never exists with stock that has no movement.
  const initialStock = (input.variants ?? []).filter((variant) => (variant.quantity ?? 0) > 0);
  const stockingWarehouseId = initialStock.length > 0 ? await resolveStockingWarehouseId(account) : null;

  const product = await withDatabaseError(async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const slug = providedSlug ?? autoSlug("product", input.name);

      try {
        return await prisma.$transaction(async (transaction) => {
        const created = await transaction.product.create({
        data: {
          name: input.name!,
          slug,
          description: input.description ?? null,
          material: input.material ?? null,
          status: input.status ?? ProductStatus.DRAFT,
          basePrice: new Prisma.Decimal(input.basePrice!),
          currency: input.currency ?? "SAR",
          categoryId: input.categoryId!,
          variants: input.variants
            ? {
                create: input.variants.map((variant) => ({
                  // A generated SKU keeps every row unique when the form leaves it out.
                  sku: variant.sku ?? autoSku(),
                  size: variant.size ?? null,
                  color: variant.color ?? null,
                  priceOverride: variant.priceOverride ? new Prisma.Decimal(variant.priceOverride) : null,
                  // Rows inherit the product's status: an ACTIVE garment arrives
                  // sellable, and a draft product stays fully draft.
                  status: variant.status ?? input.status ?? ProductStatus.DRAFT,
                })),
              }
            : undefined,
        },
        select: { id: true, variants: { select: { id: true, sku: true } } },
        });

        // Opening stock for the rows that came with a quantity. Nested creates are
        // returned in the order they were sent, and a typed SKU pins the match
        // exactly - matching on the SKU alone would send every row to the first one.
        for (const [index, variant] of (input.variants ?? []).entries()) {
          if (!variant.quantity || variant.quantity <= 0 || !stockingWarehouseId) {
            continue;
          }

          const createdVariant = variant.sku
            ? created.variants.find((entry) => entry.sku === variant.sku)
            : created.variants[index];

          if (!createdVariant) {
            continue;
          }

          await applyOpeningBalance(transaction, {
            variantId: createdVariant.id,
            warehouseId: stockingWarehouseId,
            quantity: variant.quantity,
            reason: "Opening stock",
            actorAccountId: account.id,
          });
        }

        return created;
      });
      } catch (error) {
        const clash = uniqueFieldOf(error);

        // An automatically generated slug may collide; try another token. A
        // clash on anything the user typed is reported, naming the field.
        if (!providedSlug && clash === "slug" && attempt < maxAttempts) {
          continue;
        }

        if (clash === "slug") {
          throw new ConflictError(`The slug "${slug}" is already used by another product.`);
        }

        if (clash === "sku") {
          throw new ConflictError("A variant with one of these SKUs already exists.");
        }

        return conflictFrom(error, "A product with this slug already exists.");
      }
    }

    throw new ConflictError("A unique slug could not be generated. Please try again.");
  });

  return getProductInventory(product.id);
}

export async function updateProduct(
  account: AuthenticatedAccount,
  productId: string,
  payload: unknown,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const input = parseProductWriteInput(payload, { partial: true });

  if (input.categoryId) {
    await assertCategoryExists(input.categoryId);
  }

  await assertProductExists(productId);

  const data: Prisma.ProductUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
        if (input.material !== undefined) data.material = input.material;
  if (input.status !== undefined) data.status = input.status;
  if (input.basePrice !== undefined) data.basePrice = new Prisma.Decimal(input.basePrice);
  if (input.currency !== undefined) data.currency = input.currency;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };

  await withDatabaseError(async () => {
    try {
      await prisma.product.update({ where: { id: productId }, data });
    } catch (error) {
      return conflictFrom(error, "A product with this slug already exists.");
    }
  });

  return getProductInventory(productId);
}

/** Archiving keeps the row (and its order history) and hides it from the catalog. */
export async function archiveProduct(
  account: AuthenticatedAccount,
  productId: string,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_DELETE);

  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  await assertProductExists(productId);

  await withDatabaseError(() =>
    prisma.product.update({ where: { id: productId }, data: { status: ProductStatus.ARCHIVED } }),
  );

  return getProductInventory(productId);
}

export async function createVariant(
  account: AuthenticatedAccount,
  productId: string,
  payload: unknown,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const input = parseVariantWriteInput(payload, { partial: false });
  await assertProductExists(productId);

  const providedSku = input.sku;
  const maxAttempts = providedSku ? 1 : 5;

  const openingQuantity = input.quantity ?? 0;
  const stockingWarehouseId = openingQuantity > 0 ? await resolveStockingWarehouseId(account) : null;

  await withDatabaseError(async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const sku = providedSku ?? autoSku();

      try {
      await prisma.$transaction(async (transaction) => {
      const created = await transaction.productVariant.create({
        data: {
          productId,
          sku,
          size: input.size ?? null,
          color: input.color ?? null,
          priceOverride: input.priceOverride ? new Prisma.Decimal(input.priceOverride) : null,
          status: input.status ?? ProductStatus.DRAFT,
        },
        select: { id: true },
      });

        if (openingQuantity > 0 && stockingWarehouseId) {
          await applyOpeningBalance(transaction, {
            variantId: created.id,
            warehouseId: stockingWarehouseId,
            quantity: openingQuantity,
            reason: "Opening stock",
            actorAccountId: account.id,
          });
        }

      });

        return;
      } catch (error) {
        const clash = uniqueFieldOf(error);

        if (clash === "sku") {
          if (!providedSku && attempt < maxAttempts) {
            continue;
          }

          throw new ConflictError(`The SKU "${sku}" is already used by another variant.`);
        }

        return conflictFrom(error, "A variant with this SKU already exists.");
      }
    }

    throw new ConflictError("A unique SKU could not be generated. Please try again.");
  });

  return getProductInventory(productId);
}

export async function updateVariant(
  account: AuthenticatedAccount,
  productId: string,
  variantId: string,
  payload: unknown,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(productId) || !isUuid(variantId)) {
    throw new NotFoundError("Variant not found.");
  }

  const input = parseVariantWriteInput(payload, { partial: true });
  await assertVariantBelongsToProduct(variantId, productId);

  const data: Prisma.ProductVariantUpdateInput = {};

  if (input.sku !== undefined) data.sku = input.sku;
  if (input.size !== undefined) data.size = input.size;
  if (input.color !== undefined) data.color = input.color;
  if (input.priceOverride !== undefined) {
    data.priceOverride = input.priceOverride === null ? null : new Prisma.Decimal(input.priceOverride);
  }
  if (input.status !== undefined) data.status = input.status;

  await withDatabaseError(async () => {
    try {
      await prisma.productVariant.update({ where: { id: variantId }, data });
    } catch (error) {
      return conflictFrom(error, "A variant with this SKU already exists.");
    }
  });

  return getProductInventory(productId);
}

export async function archiveVariant(
  account: AuthenticatedAccount,
  productId: string,
  variantId: string,
): Promise<ProductInventoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(productId) || !isUuid(variantId)) {
    throw new NotFoundError("Variant not found.");
  }

  await assertVariantBelongsToProduct(variantId, productId);

  await withDatabaseError(() =>
    prisma.productVariant.update({
      where: { id: variantId },
      data: { status: ProductStatus.ARCHIVED },
    }),
  );

  return getProductInventory(productId);
}

/**
 * Removes a product for good, with everything that hangs off it: its variants, stock
 * rows, ledger movements, photos and any cart line holding it. Products referenced by
 * an order line are refused, because deleting them would tear a sale apart - archiving
 * is the answer there.
 */
export async function deleteProduct(account: AuthenticatedAccount, productId: string): Promise<{ name: string }> {
  await requirePermission(PERMISSIONS.PRODUCTS_DELETE);

  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      variants: { select: { id: true } },
    },
  });

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  const variantIds = product.variants.map((variant) => variant.id);
  const orderLines = variantIds.length
    ? await prisma.orderItem.count({ where: { variantId: { in: variantIds } } })
    : 0;

  if (orderLines > 0) {
    throw new ConflictError(
      `${orderLines} order line(s) reference "${product.name}", so it cannot be deleted. Archive it instead.`,
    );
  }

  await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      if (variantIds.length > 0) {
        await transaction.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
        await transaction.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
        await transaction.inventoryItem.deleteMany({ where: { variantId: { in: variantIds } } });
      }

      await transaction.productImage.deleteMany({ where: { productId: product.id } });
      await transaction.productVariant.deleteMany({ where: { productId: product.id } });
      await transaction.product.delete({ where: { id: product.id } });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PRODUCT_DELETED",
          entity: "Product",
          entityId: product.id,
          newValue: product.name,
        },
      });
    }),
  );

  return { name: product.name };
}
