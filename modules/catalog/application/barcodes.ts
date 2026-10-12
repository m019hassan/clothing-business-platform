import "server-only";

import bwipjs from "bwip-js";

import { ProductStatus } from "@prisma/client";

import { prisma } from "@/src/lib/db";
import { withDatabaseError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";

/** Why a value cannot be drawn: barcodes only encode Latin letters and digits. */
const ENCODABLE = /^[A-Za-z0-9._-]+$/;

/**
 * A Code 128 barcode for a variant's SKU, as a data URI an <img> can show and the
 * browser can print crisply. Values outside the encodable set yield null, so the
 * label falls back to showing the SKU as text.
 */
export function renderBarcodeDataUri(value: string, options: { scale?: number; height?: number } = {}): string | null {
  if (value.length === 0 || value.length > 48 || !ENCODABLE.test(value)) {
    return null;
  }

  try {
    const svg = bwipjs.toSVG({
      bcid: "code128",
      text: value,
      scale: options.scale ?? 3,
      height: options.height ?? 12,
      includetext: true,
      textxalign: "center",
      textsize: 8,
    });

    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  } catch {
    return null;
  }
}

export type BarcodeProductOption = { id: string; name: string; variantCount: number };

/** Active products for the bulk barcode picker, filtered by a free-text search. */
export async function listBarcodeProducts(search?: string): Promise<BarcodeProductOption[]> {
  const term = (search ?? "").trim();

  return withDatabaseError(async () => {
    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: "insensitive" as const } },
                { slug: { contains: term, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
      select: { id: true, name: true, _count: { select: { variants: true } } },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      variantCount: product._count.variants,
    }));
  });
}

export type BarcodeLabel = {
  id: string;
  title: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: string;
  barcode: string | null;
};

export type BarcodeLabelGroup = { id: string; name: string; labels: BarcodeLabel[] };

/** Every variant label for the chosen products, ready for a bulk print page. */
export async function getBarcodeLabelGroups(productIds: string[]): Promise<BarcodeLabelGroup[]> {
  return withDatabaseError(async () => {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        basePrice: true,
        currency: true,
        variants: {
          orderBy: { sku: "asc" },
          select: { id: true, sku: true, size: true, color: true, priceOverride: true },
        },
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      labels: product.variants.map((variant) => ({
        id: variant.id,
        title: product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: formatMoney((variant.priceOverride ?? product.basePrice).toString(), product.currency),
        barcode: renderBarcodeDataUri(variant.sku),
      })),
    }));
  });
}
