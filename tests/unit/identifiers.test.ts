import { describe, expect, it } from "vitest";

import { autoSku, autoSlug, isValidSlug, slugifyName, suggestSku } from "@/modules/catalog/application/identifiers";

describe("slugifyName", () => {
  it("turns a Latin name into a slug", () => {
    expect(slugifyName("Linen Shirt")).toBe("linen-shirt");
    expect(slugifyName("  Oversized  Hoodie  ")).toBe("oversized-hoodie");
    expect(slugifyName("T-Shirt (2026)")).toBe("t-shirt-2026");
    expect(slugifyName("Café Noir")).toBe("cafe-noir");
  });

  it("returns null when nothing usable survives", () => {
    expect(slugifyName("تيشيرت")).toBeNull();
    expect(slugifyName("قميص رجالي")).toBeNull();
    expect(slugifyName("!!!")).toBeNull();
    expect(slugifyName("")).toBeNull();
  });
});

describe("autoSlug", () => {
  it("prefers the name when it can carry a slug", () => {
    expect(autoSlug("product", "Linen Shirt")).toBe("linen-shirt");
  });

  it("falls back to prefix plus a short token", () => {
    const slug = autoSlug("product", "تيشيرت");

    expect(slug).toMatch(/^product-[0-9a-f]{6}$/);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("generates a different token every time", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => autoSlug("category", "قميص")));

    expect(slugs.size).toBe(20);
    for (const slug of slugs) {
      expect(isValidSlug(slug)).toBe(true);
    }
  });
});

describe("suggestSku", () => {
  it("builds a readable suggestion from a slug", () => {
    expect(suggestSku("jaket")).toMatch(/^JAKET-[0-9A-F]{6}$/);
    expect(suggestSku("linen-shirt")).toMatch(/^LINEN-SHIRT-[0-9A-F]{6}$/);
  });

  it("falls back to SKU when there is nothing to prefix", () => {
    expect(suggestSku()).toMatch(/^SKU-[0-9A-F]{6}$/);
    expect(suggestSku("!!!")).toMatch(/^SKU-[0-9A-F]{6}$/);
  });

  it("gives a different code every time", () => {
    const codes = new Set(Array.from({ length: 20 }, () => suggestSku("jaket")));
    expect(codes.size).toBe(20);
  });
});

describe("autoSku", () => {
  it("builds an uppercase code that is a valid variant identifier", () => {
    const sku = autoSku();

    expect(sku).toMatch(/^VAR-[0-9A-F]{6}$/);
  });
});
