import type { ProductStatus } from "@prisma/client";

export type ProductVariantView = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  /** The library colour behind the name, for swatches; null for legacy names. */
  colorHex: string | null;
  colorNameEn: string | null;
  status: ProductStatus;
  priceOverride: string | null;
  availableQuantity: number;
};

export type ProductInventoryVariantView = ProductVariantView & {
  quantityOnHand: number;
  quantityReserved: number;
};

export type ProductInventoryView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  status: ProductStatus;
  basePrice: string;
  currency: string;
  categoryId: string;
  categoryName: string | null;
  /** The first photo, shown as a thumbnail in lists. */
  imageId: string | null;
  /** Every photo of the product, in display order, for the slider. */
  imageIds: string[];
  createdAt: string;
  updatedAt: string;
  variants: ProductInventoryVariantView[];
};

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  status: ProductStatus;
  basePrice: string;
  currency: string;
  categoryName: string | null;
  /** The first photo, shown as a thumbnail in lists. */
  imageId: string | null;
  /** Every photo of the product, in display order, for the slider. */
  imageIds: string[];
  variants: ProductVariantView[];
};

export type CategoryView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogFormState = {
  ok: boolean;
  message: string;
};
