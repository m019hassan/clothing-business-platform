/**
 * Identifier helpers for the catalog.
 *
 * A slug is a URL-safe key, so it cannot hold Arabic characters or spaces. Rather
 * than blocking a product whose name is Arabic - which is the normal case here -
 * the services generate one: a Latin name becomes its slug, anything else gets a
 * short random suffix that is unique by construction and can be edited later.
 */
import { randomBytes } from "node:crypto";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_GENERATED_LENGTH = 60;

/** Lowercases a Latin name into a slug, or returns null when nothing survives. */
export function slugifyName(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    // Latin letters keep their base form (e -> e), everything else becomes a hyphen.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_GENERATED_LENGTH)
    .replace(/-+$/g, "");

  return slug.length > 0 && SLUG_PATTERN.test(slug) ? slug : null;
}

function shortToken(): string {
  return randomBytes(3).toString("hex");
}

/**
 * Builds an automatic slug: from the name when it can carry one, otherwise
 * `<prefix>-<6 hex>`. Callers retry with a fresh token when the result clashes.
 */
export function autoSlug(prefix: string, name?: string | null): string {
  const fromName = name ? slugifyName(name) : null;

  return fromName ?? `${prefix}-${shortToken()}`;
}

/** True when the value is already a valid slug. */
export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** Automatic SKU for a variant that was created without one. */
export function autoSku(prefix = "VAR"): string {
  return `${prefix}-${shortToken().toUpperCase()}`;
}

/**
 * A ready-to-use SKU the forms pre-fill, so adding a variant never starts from an
 * empty box. The product slug makes it readable (`JAKET-4F9A2C`); without one it
 * falls back to `SKU-4F9A2C`. The user can edit or clear it, and the service
 * generates a different one if the field is emptied.
 */
export function suggestSku(prefix?: string | null): string {
  const cleaned = (prefix ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);

  const token = shortToken().toUpperCase();

  return cleaned.length > 0 ? `${cleaned}-${token}` : `SKU-${token}`;
}
