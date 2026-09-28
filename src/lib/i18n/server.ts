import "server-only";

import { cookies, headers } from "next/headers";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

import { dictionaryFor, type Dictionary } from "./dictionaries";
import { directionFor, LOCALE_COOKIE, pickLocale, type Locale } from "./index";

/** Resolves the interface language for the current request. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList, account] = await Promise.all([
    cookies(),
    headers(),
    getCurrentAccount(),
  ]);

  return pickLocale({
    accountLanguage: account?.preferredLanguage ?? null,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: headerList.get("accept-language"),
  });
}

export type InterfaceLanguage = {
  locale: Locale;
  dir: "ltr" | "rtl";
  /** Language tag for <html lang>. */
  tag: string;
  t: Dictionary;
};

/** Everything a layout needs: the locale, its direction and its strings. */
export async function getInterfaceLanguage(): Promise<InterfaceLanguage> {
  const locale = await getLocale();

  return {
    locale,
    dir: directionFor(locale),
    tag: locale,
    t: dictionaryFor(locale),
  };
}
