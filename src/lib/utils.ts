/**
 * Combines conditional class names into a single space-separated string.
 * Filters out falsey values (undefined, null, false, empty strings, 0).
 */
export function cn(...inputs: unknown[]): string {
  return inputs.filter(Boolean).join(" ");
}
