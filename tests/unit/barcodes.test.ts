import { describe, expect, it } from "vitest";

import { renderBarcodeDataUri } from "@/modules/catalog/application/barcodes";

function decode(dataUri: string): string {
  return Buffer.from(dataUri.split(",")[1], "base64").toString("utf8");
}

describe("renderBarcodeDataUri", () => {
  it("renders a scannable SVG for a Latin SKU", () => {
    const uri = renderBarcodeDataUri("VAR-4F9A2C");

    expect(uri).toBeTruthy();
    expect(uri!.startsWith("data:image/svg+xml;base64,")).toBe(true);

    const svg = decode(uri!);
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(500);
  });

  it("renders different bars for different SKUs", () => {
    const first = renderBarcodeDataUri("VAR-AAAAAA");
    const second = renderBarcodeDataUri("VAR-BBBBBB");

    expect(first).not.toBe(second);
  });

  it("refuses values a Code 128 barcode cannot carry", () => {
    expect(renderBarcodeDataUri("")).toBeNull();
    expect(renderBarcodeDataUri("مقاس 12")).toBeNull();
    expect(renderBarcodeDataUri("A".repeat(49))).toBeNull();
  });
});
