/**
 * Pure FormData -> service payload mappers.
 *
 * The services own validation; these helpers only translate a submitted form into
 * the JSON shape the services expect, so they stay free of database access and
 * can be unit tested directly.
 */

import { ValidationError } from "@/src/lib/errors";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function has(formData: FormData, key: string): boolean {
  return formData.has(key);
}

export function productFormToPayload(
  formData: FormData,
  { partial }: { partial: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const assign = (key: string, value: unknown) => {
    if (partial && !has(formData, key)) {
      return;
    }

    payload[key] = value;
  };

  assign("name", text(formData, "name") ?? "");
  assign("slug", text(formData, "slug") ?? "");
  assign("basePrice", text(formData, "basePrice") ?? "");
  assign("categoryId", text(formData, "categoryId") ?? "");
  assign("description", text(formData, "description"));
  // Sent only when filled, so an empty box on the edit form leaves the value alone.
  const material = text(formData, "material");

  if (material !== null) {
    payload.material = material;
  }

  assign("status", text(formData, "status") ?? "");

  if (!partial) {
    // The clothing form sends its size/colour/quantity/price rows as JSON.
    const rowsJson = text(formData, "variantsJson");

    if (rowsJson) {
      try {
        const rows = JSON.parse(rowsJson);

        if (Array.isArray(rows) && rows.length > 0) {
          payload.variants = rows.map((row) => {
            const entry = row as Record<string, unknown>;
            const variant: Record<string, unknown> = {};

            if (typeof entry.size === "string" && entry.size.trim()) variant.size = entry.size.trim();
            if (typeof entry.color === "string" && entry.color.trim()) variant.color = entry.color.trim();
            if (entry.quantity !== undefined && entry.quantity !== "") variant.quantity = Number(entry.quantity);
            if (typeof entry.price === "string" && entry.price.trim()) variant.priceOverride = entry.price.trim();

            return variant;
          });
        }
      } catch {
        throw new ValidationError("The variant rows could not be read.");
      }
    }

    const sku = text(formData, "variantSku");

    if (sku) {
      const variant: Record<string, unknown> = { sku };
      const size = text(formData, "variantSize");
      const color = text(formData, "variantColor");
      const priceOverride = text(formData, "variantPriceOverride");
      const status = text(formData, "variantStatus");

      if (size) variant.size = size;
      if (color) variant.color = color;
      if (priceOverride) variant.priceOverride = priceOverride;
      if (status) variant.status = status;

      payload.variants = [variant];
    }
  }

  return payload;
}

export function variantFormToPayload(
  formData: FormData,
  { partial }: { partial: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const assign = (key: string, value: unknown) => {
    if (partial && !has(formData, key)) {
      return;
    }

    payload[key] = value;
  };

  assign("sku", text(formData, "sku") ?? "");
  assign("status", text(formData, "status") ?? "");

  // Empty means "clear the attribute" once the field is part of the form.
  if (!partial || has(formData, "size")) {
    payload.size = text(formData, "size");
  }

  if (!partial || has(formData, "color")) {
    payload.color = text(formData, "color");
  }

  if (!partial || has(formData, "priceOverride")) {
    payload.priceOverride = text(formData, "priceOverride");
  }

  return payload;
}

export function categoryFormToPayload(
  formData: FormData,
  { partial }: { partial: boolean },
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const assign = (key: string, value: unknown) => {
    if (partial && !has(formData, key)) {
      return;
    }

    payload[key] = value;
  };

  assign("name", text(formData, "name") ?? "");
  assign("slug", text(formData, "slug") ?? "");
  assign("description", text(formData, "description"));

  if (!partial || has(formData, "isActive")) {
    payload.isActive = formData.get("isActive") === "on";
  }

  return payload;
}
