/**
 * generateInvoiceQr
 * Server-side utility – generates an SVG QR code string for a given URL.
 * Uses the `qrcode` package which runs in Node.js (no browser bundle cost).
 */
import QRCode from "qrcode";

/**
 * Returns an inline SVG string (data URL safe) that encodes `url`.
 * Light: white background, dark: charcoal modules – works on both light and dark print.
 */
export async function generateInvoiceQr(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#1e293b",  // slate-800
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}
