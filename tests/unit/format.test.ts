import { describe, expect, it } from "vitest";

import { formatDate, formatMoney, formatVariantAttributes, variantLabel } from "@/src/lib/format";

describe("formatMoney", () => {
  it("renders two decimals with the currency", () => {
    expect(formatMoney("450", "SAR")).toBe("450.00 SAR");
    expect(formatMoney("12.5", "SAR")).toBe("12.50 SAR");
  });

  it("returns the raw value when it is not numeric", () => {
    expect(formatMoney("n/a", "SAR")).toBe("n/a SAR");
  });
});

describe("formatDate", () => {
  it("formats a date as dd MMM yyyy", () => {
    expect(formatDate("2026-09-20T10:00:00.000Z")).toMatch(/\d{2} \w{3} \d{4}/);
  });
});

describe("formatVariantAttributes", () => {
  it("joins present attributes", () => {
    expect(formatVariantAttributes("M", "Red")).toBe("M · Red");
  });

  it("uses the empty label when nothing is set", () => {
    expect(formatVariantAttributes(null, null)).toBe("No attributes");
  });

  it("supports a custom empty label", () => {
    expect(formatVariantAttributes(null, null, "none")).toBe("none");
  });
});

describe("variantLabel", () => {
  it("combines sku and attributes", () => {
    expect(variantLabel("SHIRT-1", "M", "Red")).toBe("SHIRT-1 · M · Red");
  });

  it("skips missing attributes", () => {
    expect(variantLabel("SHIRT-1", null, null)).toBe("SHIRT-1");
  });
});
