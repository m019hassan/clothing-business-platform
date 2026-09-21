import { describe, expect, it } from "vitest";

import {
  parseProductWriteInput,
  parseVariantWriteInput,
} from "@/modules/catalog/application/product-management";
import { parseProductListFilters } from "@/modules/catalog/application/products";

const CATEGORY_ID = "11111111-2222-4333-8444-555555555555";

describe("parseProductWriteInput", () => {
  const valid = {
    name: "Linen Shirt",
    slug: "linen-shirt",
    description: "  Breathable summer shirt  ",
    status: "ACTIVE",
    basePrice: "149.9",
    currency: "SAR",
    categoryId: CATEGORY_ID,
    variants: [{ sku: "LINEN-M", size: "M", priceOverride: "139.00" }],
  };

  it("normalises a valid create payload", () => {
    const input = parseProductWriteInput(valid, { partial: false });

    expect(input.name).toBe("Linen Shirt");
    expect(input.description).toBe("Breathable summer shirt");
    expect(input.basePrice).toBe("149.90");
    expect(input.status).toBe("ACTIVE");
    expect(input.currency).toBe("SAR");
    expect(input.variants?.[0]).toEqual({
      sku: "LINEN-M",
      size: "M",
      priceOverride: "139.00",
    });
  });

  it("requires the mandatory fields on create", () => {
    for (const field of ["name", "slug", "basePrice", "categoryId"]) {
      const payload: Record<string, unknown> = { ...valid };
      delete payload[field];

      expect(() => parseProductWriteInput(payload, { partial: false })).toThrowError();
    }
  });

  it("rejects an empty update payload", () => {
    expect(() => parseProductWriteInput({}, { partial: true })).toThrowError();
  });

  it("rejects unknown fields", () => {
    expect(() =>
      parseProductWriteInput({ ...valid, cost: "10" }, { partial: false }),
    ).toThrowError();
  });

  it("rejects malformed slugs and money", () => {
    expect(() => parseProductWriteInput({ ...valid, slug: "Linen Shirt" }, { partial: false })).toThrowError();
    expect(() => parseProductWriteInput({ ...valid, basePrice: "12.345" }, { partial: false })).toThrowError();
    expect(() => parseProductWriteInput({ ...valid, basePrice: "abc" }, { partial: false })).toThrowError();
    expect(() => parseProductWriteInput({ ...valid, currency: "USD" }, { partial: false })).toThrowError();
    expect(() => parseProductWriteInput({ ...valid, categoryId: "not-a-uuid" }, { partial: false })).toThrowError();
    expect(() => parseProductWriteInput({ ...valid, status: "DELETED" }, { partial: false })).toThrowError();
  });

  it("accepts partial updates", () => {
    const input = parseProductWriteInput({ basePrice: 99 }, { partial: true });

    expect(input).toEqual({ basePrice: "99.00" });
  });
});

describe("parseVariantWriteInput", () => {
  it("normalises attributes and clears empty strings", () => {
    const input = parseVariantWriteInput(
      { sku: "SHIRT-XL", size: "  ", color: "Blue" },
      { partial: false },
    );

    expect(input).toEqual({ sku: "SHIRT-XL", size: null, color: "Blue" });
  });

  it("requires a SKU on create and rejects bad SKUs", () => {
    expect(() => parseVariantWriteInput({ size: "M" }, { partial: false })).toThrowError();
    expect(() => parseVariantWriteInput({ sku: "bad sku!" }, { partial: false })).toThrowError();
  });

  it("allows clearing the price override", () => {
    expect(parseVariantWriteInput({ priceOverride: null }, { partial: true })).toEqual({
      priceOverride: null,
    });
  });
});

describe("parseProductListFilters", () => {
  it("returns an empty filter set for an empty query", () => {
    expect(parseProductListFilters(new URLSearchParams())).toEqual({});
  });

  it("trims the search and category filters", () => {
    const filters = parseProductListFilters(
      new URLSearchParams({ q: "  shirt ", category: " shirts ", sort: "price_desc" }),
    );

    expect(filters).toEqual({ search: "shirt", categorySlug: "shirts", sort: "price_desc" });
  });

  it("rejects blank search, unknown sort and oversized values", () => {
    expect(() => parseProductListFilters(new URLSearchParams({ q: "   " }))).toThrowError();
    expect(() => parseProductListFilters(new URLSearchParams({ sort: "cheapest" }))).toThrowError();
    expect(() => parseProductListFilters(new URLSearchParams({ q: "x".repeat(101) }))).toThrowError();
  });
});
