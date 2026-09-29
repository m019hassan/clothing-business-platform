import { describe, expect, it } from "vitest";

import { normalizeDigits } from "@/src/lib/validation";

describe("normalizeDigits", () => {
  it("rewrites Arabic-Indic digits as Latin ones", () => {
    expect(normalizeDigits("١٠٠")).toBe("100");
    expect(normalizeDigits("٥")).toBe("5");
    expect(normalizeDigits("١٢٣٤٥٦٧٨٩٠")).toBe("1234567890");
  });

  it("rewrites extended Arabic-Indic (Persian) digits too", () => {
    expect(normalizeDigits("۱۲۳۴۵")).toBe("12345");
  });

  it("reads the Arabic decimal separator as a dot and drops thousands separators", () => {
    expect(normalizeDigits("١٢٫٥٠")).toBe("12.50");
    expect(normalizeDigits("١٬٢٣٤٫٥")).toBe("1234.5");
    expect(normalizeDigits("1,234.50")).toBe("1234.50");
  });

  it("leaves Latin digits and other text untouched", () => {
    expect(normalizeDigits("100")).toBe("100");
    expect(normalizeDigits("12.50")).toBe("12.50");
    expect(normalizeDigits("مقاس ١٢")).toBe("مقاس 12");
  });
});
