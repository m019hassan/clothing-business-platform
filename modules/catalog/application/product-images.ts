import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";
import { assertUploadAllowed, readUpload, saveUpload } from "@/src/lib/storage";
import { isUuid } from "@/src/lib/validation";

type Actor = NonNullable<SafeAccount>;

export type ProductImageView = {
  id: string;
  productId: string;
  variantId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const MAX_IMAGES_PER_PRODUCT = 12;

function mapImage(image: {
  id: string;
  productId: string;
  variantId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}): ProductImageView {
  return {
    id: image.id,
    productId: image.productId,
    variantId: image.variantId,
    originalName: image.originalName,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    createdAt: image.createdAt.toISOString(),
  };
}

/** Photos of a product, oldest first (visible to any signed-in account). */
export async function listProductImages(productId: string): Promise<ProductImageView[]> {
  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return images.map(mapImage);
}

/**
 * Stores one photo (products.update). A photo may belong to one colour by passing
 * the variant id, which is how the shop shows "the red version".
 */
export async function addProductImage(
  actor: Actor,
  productId: string,
  file: { data: Buffer; contentType: string; originalName: string },
  variantId?: string | null,
): Promise<ProductImageView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  assertUploadAllowed(file.contentType, file.data.byteLength);

  if (!file.contentType.startsWith("image/")) {
    throw new ValidationError("Only images can be attached to a product.");
  }

  if (!isUuid(productId)) {
    throw new NotFoundError("Product not found.");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, _count: { select: { images: true } } },
  });

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  if (product._count.images >= MAX_IMAGES_PER_PRODUCT) {
    throw new ConflictError(`A product can hold at most ${MAX_IMAGES_PER_PRODUCT} photos.`);
  }

  if (variantId) {
    if (!isUuid(variantId)) {
      throw new ValidationError("variantId must be a variant id.");
    }

    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundError("Variant not found on this product.");
    }
  }

  const stored = await saveUpload(file);

  const image = await prisma.$transaction(async (transaction) => {
    const created = await transaction.productImage.create({
      data: {
        productId,
        variantId: variantId ?? null,
        fileKey: stored.key,
        originalName: file.originalName.slice(0, 255),
        mimeType: file.contentType,
        sizeBytes: stored.sizeBytes,
        uploadedByAccountId: actor.id,
      },
    });

    await transaction.auditLog.create({
      data: {
        accountId: actor.id,
        action: "PRODUCT_IMAGE_ADDED",
        entity: "Product",
        entityId: productId,
        newValue: created.id,
      },
    });

    return created;
  });

  return mapImage(image);
}

/** Removes one photo (products.update). */
export async function deleteProductImage(actor: Actor, imageId: string): Promise<void> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(imageId)) {
    throw new NotFoundError("Photo not found.");
  }

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true },
  });

  if (!image) {
    throw new NotFoundError("Photo not found.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.productImage.delete({ where: { id: imageId } });

    await transaction.auditLog.create({
      data: {
        accountId: actor.id,
        action: "PRODUCT_IMAGE_REMOVED",
        entity: "Product",
        entityId: image.productId,
        newValue: imageId,
      },
    });
  });
}

/** Streams a photo back to a signed-in viewer. */
export async function readProductImage(imageId: string): Promise<{ data: Buffer; mimeType: string }> {
  if (!isUuid(imageId)) {
    throw new NotFoundError("Photo not found.");
  }

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { fileKey: true, mimeType: true },
  });

  if (!image) {
    throw new NotFoundError("Photo not found.");
  }

  const data = await readUpload(image.fileKey);

  if (!data) {
    throw new NotFoundError("The stored photo could not be found.");
  }

  return { data, mimeType: image.mimeType };
}
