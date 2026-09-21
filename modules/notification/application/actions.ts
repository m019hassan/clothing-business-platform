"use server";

import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
  updateAccountPreferences,
  updateNotificationPreference,
} from "@/modules/notification/application/notifications";
import type { PreferencesFormState } from "@/modules/notification/types";
import { toAppError } from "@/src/lib/errors";

/**
 * Marking a notification as read is never destructive: an unknown or stale id
 * simply leaves the list unchanged, so failures are logged as app errors and
 * the page is refreshed either way.
 */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const notificationId = formData.get("notificationId");

  try {
    const account = await requireAuthenticated();

    if (typeof notificationId === "string" && notificationId.length > 0) {
      await markNotificationRead(account, notificationId);
    }
  } catch (error) {
    toAppError(error);
  }

  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  try {
    const account = await requireAuthenticated();
    await markAllNotificationsRead(account);
  } catch (error) {
    toAppError(error);
  }

  revalidatePath("/", "layout");
}

/** Shared result for the preferences forms (server-validated, user-facing message). */
function preferencesFailure(error: unknown): PreferencesFormState {
  const appError = toAppError(error);

  return {
    ok: false,
    message:
      appError.code === "VALIDATION_ERROR"
        ? appError.message
        : "Unable to save your preferences right now.",
  };
}

export async function updateAccountPreferencesAction(
  _previousState: PreferencesFormState,
  formData: FormData,
): Promise<PreferencesFormState> {
  try {
    const account = await requireAuthenticated();
    const language = formData.get("preferredLanguage");
    const timezone = formData.get("timezone");
    // The checkbox only exists for customer accounts; its hidden companion
    // tells the action whether marketing consent is part of this submission.
    const hasMarketingField = formData.get("marketingConsentField") === "1";
    const marketingConsent = formData.get("marketingConsent");

    await updateAccountPreferences(account, {
      preferredLanguage:
        typeof language === "string" && language.length > 0 ? language : undefined,
      timezone:
        typeof timezone === "string" && timezone.trim().length > 0 ? timezone.trim() : undefined,
      marketingConsent: hasMarketingField ? marketingConsent === "on" : undefined,
    });
  } catch (error) {
    return preferencesFailure(error);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Preferences saved." };
}

export async function updateNotificationPreferencesAction(
  _previousState: PreferencesFormState,
  formData: FormData,
): Promise<PreferencesFormState> {
  try {
    const account = await requireAuthenticated();

    for (const type of Object.values(NotificationType)) {
      // An unchecked checkbox is absent from the payload, which is exactly the
      // "in-app notifications off" case.
      await updateNotificationPreference(account, type, formData.get(`inApp_${type}`) === "on");
    }
  } catch (error) {
    return preferencesFailure(error);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Notification preferences saved." };
}
