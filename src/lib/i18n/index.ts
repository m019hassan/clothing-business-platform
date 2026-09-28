/**
 * Language support for the application interface.
 *
 * The locale is resolved per request (see ./server.ts) instead of living in the
 * URL, so no route had to be restructured: an account's stored preference wins,
 * then the `clothing-locale` cookie, then the browser's Accept-Language header,
 * then English.
 */
export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers the choice for signed-out pages (the login screen). */
export const LOCALE_COOKIE = "clothing-locale";

const LANGUAGE_TAGS: Record<Locale, string> = { en: "en", ar: "ar" };

/** Names shown in the switcher, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Accepts what browsers and databases actually hold: `ar`, `AR`, `ar-SA`,
 * `ar_SA`, `en-US`, and returns the base language, or null when unsupported.
 */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") {
    return null;
  }

  const base = value.trim().toLowerCase().split(/[-_]/)[0];

  return isLocale(base) ? base : null;
}

export function directionFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function languageTagFor(locale: Locale): string {
  return LANGUAGE_TAGS[locale];
}

/** The other language, for a one-click switcher label. */
export function nextLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/**
 * Precedence, most specific first: the account's stored preference, then the
 * cookie, then the browser's header list, then the default. Pure on purpose so
 * the rule is testable without a request.
 */
export function pickLocale(input: {
  accountLanguage?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const fromAccount = normalizeLocale(input.accountLanguage);

  if (fromAccount) {
    return fromAccount;
  }

  const fromCookie = normalizeLocale(input.cookie);

  if (fromCookie) {
    return fromCookie;
  }

  // "ar-SA,ar;q=0.9,en;q=0.8" - first entry the application speaks.
  for (const part of (input.acceptLanguage ?? "").split(",")) {
    const candidate = normalizeLocale(part.split(";")[0]);

    if (candidate) {
      return candidate;
    }
  }

  return DEFAULT_LOCALE;
}
