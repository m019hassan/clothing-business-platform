import "server-only";

import bwipjs from "bwip-js";

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
