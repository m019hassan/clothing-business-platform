import { describe, expect, it } from "vitest";

import {
  categoryFormToPayload,
  productFormToPayload,
  variantFormToPayload,
} from "@/modules/catalog/application/form-payloads";
import { parseProductListFilters } from "@/modules/catalog/application/products";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }

  return data;
}

describe("productFormToPayload", () => {
  it("maps a create form, including the optional first variant", () => {
    const payload = productFormToPayload(
      form({
        name: "  Linen Shirt ",
        slug: "linen-shirt",
        basePrice: "149.00",
        categoryId: "11111111-2222-4333-8444-555555555555",
        description: "  ",
        status: "ACTIVE",
        variantSku: "LINEN-M",
        variantSize: "M",
        variantColor: "",
        variantPriceOverride: "139.00",
        variantStatus: "ACTIVE",
      }),
      { partial: false },
    );

    expect(payload).toEqual({
      name: "Linen Shirt",
      slug: "linen-shirt",
      basePrice: "149.00",
      categoryId: "11111111-2222-4333-8444-555555555555",
      description: null,
      status: "ACTIVE",
      variants: [{ sku: "LINEN-M", size: "M", priceOverride: "139.00", status: "ACTIVE" }],
    });
  });

  it("omits the variants array when no SKU was entered", () => {
    const payload = productFormToPayload(
      form({
        name: "Shirt",
        slug: "shirt",
        basePrice: "10",
        categoryId: "11111111-2222-4333-8444-555555555555",
        status: "DRAFT",
      }),
      { partial: false },
    );

    expect(payload.variants).toBeUndefined();
  });

  it("sends only the fields present in a partial update", () => {
    const payload = productFormToPayload(form({ name: "Renamed" }), { partial: true });

    expect(payload).toEqual({ name: "Renamed" });
  });

  it("clears a description with an empty field on update", () => {
    expect(productFormToPayload(form({ description: "" }), { partial: true })).toEqual({
      description: null,
    });
  });
});

describe("variantFormToPayload", () => {
  it("maps a create form", () => {
    expect(
      variantFormToPayload(form({ sku: " SHIRT-L ", size: "L", color: "Blue", status: "ACTIVE" }), {
        partial: false,
      }),
    ).toEqual({ sku: "SHIRT-L", status: "ACTIVE", size: "L", color: "Blue", priceOverride: null });
  });

  it("keeps empty attributes as null so they can be cleared", () => {
    const payload = variantFormToPayload(form({ size: "", priceOverride: "" }), { partial: true });

    expect(payload).toEqual({ size: null, priceOverride: null });
  });

  it("omits fields that are not part of a partial form", () => {
    expect(variantFormToPayload(form({ color: "Red" }), { partial: true })).toEqual({ color: "Red" });
  });
});

describe("categoryFormToPayload", () => {
  it("reads the active checkbox", () => {
    expect(
      categoryFormToPayload(form({ name: "Hats", slug: "hats", isActive: "on" }), { partial: false }),
    ).toEqual({ name: "Hats", slug: "hats", description: null, isActive: true });

    expect(categoryFormToPayload(form({ name: "Hats", slug: "hats" }), { partial: false })).toEqual({
      name: "Hats",
      slug: "hats",
      description: null,
      isActive: false,
    });
  });

  it("sends only the provided fields on update", () => {
    expect(categoryFormToPayload(form({ isActive: "on" }), { partial: true })).toEqual({
      isActive: true,
    });
  });
});

describe("status filter", () => {
  it("is rejected without catalog access", () => {
    expect(() => parseProductListFilters(new URLSearchParams({ status: "DRAFT" }))).toThrowError();
  });

  it("accepts known statuses for catalog staff and rejects unknown ones", () => {
    expect(
      parseProductListFilters(new URLSearchParams({ status: "DRAFT" }), { allowStatus: true }),
    ).toMatchObject({ status: "DRAFT" });

    expect(() =>
      parseProductListFilters(new URLSearchParams({ status: "DELETED" }), { allowStatus: true }),
    ).toThrowError();
  });
});
