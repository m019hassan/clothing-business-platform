import { describe, expect, it } from "vitest";

import { ar } from "@/src/lib/i18n/dictionaries/ar";
import { en, type Dictionary } from "@/src/lib/i18n/dictionaries/en";
import {
  DEFAULT_LOCALE,
  directionFor,
  isLocale,
  LOCALES,
  nextLocale,
  normalizeLocale,
  pickLocale,
} from "@/src/lib/i18n";

function keyPaths(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof entry === "object" && entry !== null
      ? keyPaths(entry as Record<string, unknown>, path)
      : [path];
  });
}

describe("locale helpers", () => {
  it("recognises supported locales and nothing else", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(LOCALES).toHaveLength(2);
  });

  it("normalizes what browsers and databases actually store", () => {
    expect(normalizeLocale("AR")).toBe("ar");
    expect(normalizeLocale("ar-SA")).toBe("ar");
    expect(normalizeLocale("ar_SA")).toBe("ar");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("  ar  ")).toBe("ar");
    expect(normalizeLocale("fr-FR")).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });

  it("maps directions and the other language", () => {
    expect(directionFor("ar")).toBe("rtl");
    expect(directionFor("en")).toBe("ltr");
    expect(nextLocale("ar")).toBe("en");
    expect(nextLocale("en")).toBe("ar");
  });

  it("prefers the account, then the cookie, then the browser header", () => {
    expect(
      pickLocale({ accountLanguage: "en", cookie: "ar", acceptLanguage: "ar-SA,ar;q=0.9" }),
    ).toBe("en");
    expect(pickLocale({ accountLanguage: null, cookie: "ar", acceptLanguage: "en-US" })).toBe("ar");
    expect(pickLocale({ cookie: null, acceptLanguage: "fr-FR,fr;q=0.9,ar;q=0.5" })).toBe("ar");
    expect(pickLocale({ acceptLanguage: "fr-FR,de;q=0.9" })).toBe(DEFAULT_LOCALE);
    expect(pickLocale({})).toBe(DEFAULT_LOCALE);
    expect(pickLocale({ accountLanguage: "klingon", cookie: "nope" })).toBe(DEFAULT_LOCALE);
  });
});

describe("dictionaries", () => {
  it("the Arabic dictionary mirrors the English key set exactly", () => {
    expect(keyPaths(ar as unknown as Record<string, unknown>).sort()).toEqual(
      keyPaths(en as unknown as Record<string, unknown>).sort(),
    );
  });

  it("has no empty translations", () => {
    for (const path of keyPaths(en as unknown as Record<string, unknown>)) {
      const read = (source: Dictionary, keyPath: string) =>
        keyPath.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], source);

      expect(String(read(en, path)).trim().length).toBeGreaterThan(0);
      expect(String(read(ar, path)).trim().length).toBeGreaterThan(0);
    }
  });
});
