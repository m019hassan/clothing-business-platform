"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { updateAccountPreferences } from "@/modules/notification/application/notifications";

import { isLocale, LOCALE_COOKIE } from "./index";

/**
 * Switches the interface language: the cookie covers signed-out pages (the login
 * screen), and a signed-in account also stores the choice as its
 * `preferredLanguage`, which is the documented preference the API already writes.
 */
export async function setLocaleAction(value: unknown): Promise<void> {
  if (!isLocale(value)) {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const account = await getCurrentAccount();

  if (account && account.preferredLanguage !== value) {
    await updateAccountPreferences(account, { preferredLanguage: value });
  }

  revalidatePath("/", "layout");
}
