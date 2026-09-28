import { DEFAULT_LOCALE, type Locale } from "@/src/lib/i18n";

import { ar } from "./ar";
import { en, type Dictionary } from "./en";

export const DICTIONARIES: Record<Locale, Dictionary> = { en, ar };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export type { Dictionary };
