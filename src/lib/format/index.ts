export function formatMoney(value: string, currency: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

// Deterministic month names: toLocaleDateString output varies with the
// runtime ICU data (e.g. "Sep" vs "Sept"), so the format is fixed here.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string): string {
  const date = new Date(value);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];

  return `${day} ${month} ${date.getUTCFullYear()}`;
}

export function formatVariantAttributes(
  size: string | null,
  color: string | null,
  emptyLabel = "No attributes",
): string {
  const attributes = [size, color].filter(
    (attribute): attribute is string => attribute !== null && attribute !== "",
  );

  return attributes.length > 0 ? attributes.join(" · ") : emptyLabel;
}

export function variantLabel(sku: string, size: string | null, color: string | null): string {
  return [sku, size, color].filter((part): part is string => part !== null && part !== "").join(" · ");
}
