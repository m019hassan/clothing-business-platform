import type { NotificationType } from "@prisma/client";

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPageView = {
  notifications: NotificationView[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type NotificationPreferenceView = {
  type: NotificationType;
  inApp: boolean;
};

export type AccountPreferenceView = {
  preferredLanguage: string;
  timezone: string;
  marketingConsent: boolean | null;
};

export type PreferencesFormState = {
  ok: boolean;
  message: string;
};
