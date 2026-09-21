import Link from "next/link";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const label =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-2 6h16c-.5-.5-2-2-2-6" />
        <path d="M10.5 19a2 2 0 0 0 3 0" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
