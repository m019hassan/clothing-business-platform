export function formatMoney(value: string, currency: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
