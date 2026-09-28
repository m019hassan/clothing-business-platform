import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notification/application/actions";
import { listNotifications } from "@/modules/notification/application/notifications";
import type { NotificationView } from "@/modules/notification/types";
import { formatDate } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

const PAGE_SIZE = 20;

type NotificationsPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));

  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

function typeLabel(type: string, labels: Record<string, string>): string {
  return labels[type] ?? type;
}

function NotificationRow({
  notification,
  typeLabels,
  unreadAria,
  readLabel,
  markReadLabel,
}: {
  notification: NotificationView;
  typeLabels: Record<string, string>;
  unreadAria: string;
  readLabel: string;
  markReadLabel: string;
}) {
  const isUnread = notification.readAt === null;

  return (
    <li
      className={[
        "flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-start sm:justify-between",
        isUnread ? "bg-blue-50/40" : "bg-white",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isUnread ? (
            <span
              aria-label={unreadAria}
              className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
            />
          ) : null}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {typeLabel(notification.type, typeLabels)}
          </span>
          <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-900">{notification.title}</p>
        {notification.body ? (
          <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
        ) : null}
        {notification.entityType === "Order" && notification.entityId ? (
          <Link
            href={`/orders/${notification.entityId}`}
            className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            View order
          </Link>
        ) : null}
      </div>

      {isUnread ? (
        <form action={markNotificationReadAction} className="shrink-0">
          <input type="hidden" name="notificationId" value={notification.id} />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {markReadLabel}
          </button>
        </form>
      ) : (
        <span className="shrink-0 text-xs font-medium text-slate-400">{readLabel}</span>
      )}
    </li>
  );
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);

  const page = await listNotifications(account, { limit, offset });
  const { notifications, unreadCount, pagination } = page;

  const rangeStart = notifications.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + notifications.length;
  const hasPrevious = offset > 0;
  const hasNext = offset + notifications.length < pagination.total;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t.notifications.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {unreadCount > 0
              ? `${unreadCount} unread of ${pagination.total} total`
              : `All ${pagination.total} notifications are read`}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Mark all as read
            </button>
          </form>
        ) : null}
      </section>

      {notifications.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.notifications.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            Order and payment updates for your account will appear here.
          </p>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-200">
              {notifications.map((notification) => (
                <NotificationRow
                    key={notification.id}
                    notification={notification}
                    typeLabels={t.notifications.types as Record<string, string>}
                    unreadAria={t.notifications.unreadAria}
                    readLabel={t.notifications.read}
                    markReadLabel={t.notifications.markRead}
                  />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/notifications?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Previous
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/notifications?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Next
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
