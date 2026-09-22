import "server-only";

import { NotificationType, Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type {
  AccountPreferenceView,
  NotificationPageView,
  NotificationPreferenceView,
  NotificationView,
} from "@/modules/notification/types";
import { prisma } from "@/src/lib/db";
import {
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const notificationSelection = {
  id: true,
  type: true,
  title: true,
  body: true,
  entityType: true,
  entityId: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationRecord = Prisma.NotificationGetPayload<{
  select: typeof notificationSelection;
}>;

function mapNotification(record: NotificationRecord): NotificationView {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    body: record.body,
    entityType: record.entityType,
    entityId: record.entityId,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

/** Notifications are always scoped to the authenticated account. */
export async function listNotifications(
  account: AuthenticatedAccount,
  pagination: Pagination,
): Promise<NotificationPageView> {
  return withDatabaseError(async () => {
    const where: Prisma.NotificationWhereInput = { accountId: account.id };

    const [records, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
        select: notificationSelection,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { accountId: account.id, readAt: null } }),
    ]);

    return {
      notifications: records.map(mapNotification),
      unreadCount,
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

export async function getUnreadNotificationCount(
  account: AuthenticatedAccount,
): Promise<number> {
  return withDatabaseError(() =>
    prisma.notification.count({ where: { accountId: account.id, readAt: null } }),
  );
}

export async function markNotificationRead(
  account: AuthenticatedAccount,
  notificationId: string,
): Promise<NotificationView> {
  if (!isUuid(notificationId)) {
    throw new NotFoundError("Notification not found.");
  }

  return withDatabaseError(async () => {
    // Ownership is part of the write condition, so another account's id can
    // never be modified even if it is guessed. readAt: null keeps the original
    // read timestamp when the action is repeated.
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, accountId: account.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count !== 1) {
      const existing = await prisma.notification.findFirst({
        where: { id: notificationId, accountId: account.id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundError("Notification not found.");
      }
    }

    const record = await prisma.notification.findFirst({
      where: { id: notificationId, accountId: account.id },
      select: notificationSelection,
    });

    if (!record) {
      throw new NotFoundError("Notification not found.");
    }

    return mapNotification(record);
  });
}

export async function markAllNotificationsRead(
  account: AuthenticatedAccount,
): Promise<number> {
  return withDatabaseError(async () => {
    const result = await prisma.notification.updateMany({
      where: { accountId: account.id, readAt: null },
      data: { readAt: new Date() },
    });

    return result.count;
  });
}

export async function getNotificationPreferences(
  account: AuthenticatedAccount,
): Promise<NotificationPreferenceView[]> {
  return withDatabaseError(async () => {
    const rows = await prisma.notificationPreference.findMany({
      where: { accountId: account.id },
      select: { type: true, inApp: true },
    });

    return Object.values(NotificationType).map((type) => ({
      type,
      inApp: rows.find((row) => row.type === type)?.inApp ?? true,
    }));
  });
}

export async function updateNotificationPreference(
  account: AuthenticatedAccount,
  type: string,
  inApp: boolean,
): Promise<NotificationPreferenceView> {
  if (!(Object.values(NotificationType) as string[]).includes(type)) {
    throw new ValidationError("Unknown notification type.");
  }

  if (typeof inApp !== "boolean") {
    throw new ValidationError("inApp must be a boolean.");
  }

  const notificationType = type as NotificationType;

  return withDatabaseError(async () => {
    const row = await prisma.notificationPreference.upsert({
      where: {
        accountId_type: { accountId: account.id, type: notificationType },
      },
      create: { accountId: account.id, type: notificationType, inApp },
      update: { inApp },
      select: { type: true, inApp: true },
    });

    return row;
  });
}

const SUPPORTED_LANGUAGES = ["ar", "en"];

export async function getAccountPreferences(
  account: AuthenticatedAccount,
): Promise<AccountPreferenceView> {
  return withDatabaseError(async () => {
    const record = await prisma.account.findUnique({
      where: { id: account.id },
      select: {
        preferredLanguage: true,
        timezone: true,
        customerProfile: { select: { marketingConsent: true } },
      },
    });

    if (!record) {
      throw new NotFoundError("Account not found.");
    }

    return {
      preferredLanguage: record.preferredLanguage,
      timezone: record.timezone,
      marketingConsent: record.customerProfile?.marketingConsent ?? null,
    };
  });
}

export async function updateAccountPreferences(
  account: AuthenticatedAccount,
  input: { preferredLanguage?: unknown; timezone?: unknown; marketingConsent?: unknown },
): Promise<AccountPreferenceView> {
  const data: Prisma.AccountUpdateInput = {};

  if (input.preferredLanguage !== undefined) {
    if (
      typeof input.preferredLanguage !== "string" ||
      !SUPPORTED_LANGUAGES.includes(input.preferredLanguage)
    ) {
      throw new ValidationError(`preferredLanguage must be one of: ${SUPPORTED_LANGUAGES.join(", ")}.`);
    }

    data.preferredLanguage = input.preferredLanguage;
  }

  if (input.timezone !== undefined) {
    if (typeof input.timezone !== "string") {
      throw new ValidationError("timezone must be a valid IANA time zone.");
    }

    const supported = Intl.supportedValuesOf("timeZone") as string[];

    if (!supported.includes(input.timezone)) {
      throw new ValidationError("timezone must be a valid IANA time zone.");
    }

    data.timezone = input.timezone;
  }

  let marketingConsent: boolean | undefined;

  if (input.marketingConsent !== undefined) {
    if (typeof input.marketingConsent !== "boolean") {
      throw new ValidationError("marketingConsent must be a boolean.");
    }

    marketingConsent = input.marketingConsent;
  }

  if (Object.keys(data).length === 0 && marketingConsent === undefined) {
    throw new ValidationError("Provide at least one preference to update.");
  }

  return withDatabaseError(async () => {
    await prisma.$transaction(async (transaction) => {
      if (Object.keys(data).length > 0) {
        await transaction.account.update({ where: { id: account.id }, data });
      }

      if (marketingConsent !== undefined) {
        const profile = await transaction.customerProfile.findUnique({
          where: { accountId: account.id },
          select: { id: true },
        });

        if (!profile) {
          throw new ValidationError("Marketing consent applies to customer accounts only.");
        }

        await transaction.customerProfile.update({
          where: { id: profile.id },
          data: { marketingConsent },
        });
      }
    });

    return getAccountPreferences(account);
  });
}

/**
 * Creates an in-app notification for a recipient account. Called from the
 * existing order/payment transactions so the notification and the business
 * change commit or roll back together.
 */
export async function createNotification(
  transaction: Prisma.TransactionClient,
  input: {
    accountId: string;
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  },
): Promise<void> {
  // Respect the recipient's per-type in-app preference (on when unset).
  const preference = await transaction.notificationPreference.findUnique({
    where: { accountId_type: { accountId: input.accountId, type: input.type } },
    select: { inApp: true },
  });

  if (preference && !preference.inApp) {
    return;
  }

  await transaction.notification.create({
    data: {
      accountId: input.accountId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}
