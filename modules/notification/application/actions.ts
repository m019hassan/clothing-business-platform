"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notification/application/notifications";
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
