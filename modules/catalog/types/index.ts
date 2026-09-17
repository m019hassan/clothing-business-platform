import type { ProductStatus } from "@prisma/client";

export type ProductVariantView = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  status: ProductStatus;
  priceOverride: string | null;
  availableQuantity: number;
};

export type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  basePrice: string;
  currency: string;
  categoryName: string | null;
  variants: ProductVariantView[];
};
