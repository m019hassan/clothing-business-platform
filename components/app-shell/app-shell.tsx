"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/modules/auth/application/actions";
import { NotificationBell } from "@/modules/notification/components/notification-bell";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", customerOnly: false },
  { href: "/reports", label: "Reports", customerOnly: false, requiresReports: true },
  { href: "/products", label: "Products", customerOnly: false },
  { href: "/orders", label: "Orders", customerOnly: true },
  { href: "/cart", label: "Cart", customerOnly: true },
  { href: "/account", label: "Account", customerOnly: false },
  { href: "/inventory", label: "Inventory", customerOnly: false, requiresInventory: true },
  { href: "/payments", label: "Payments", customerOnly: false, requiresPayments: true },
  { href: "/customers", label: "Customers", customerOnly: false, requiresCustomers: true },
  { href: "/employees", label: "Employees", customerOnly: false, requiresEmployees: true },
  { href: "/roles", label: "Roles", customerOnly: false, requiresRoles: true },
] as const;

function NavIcon({ href }: { href: string }) {
  const common = {
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  if (href === "/dashboard") {
    return (
      <svg {...common}>
        <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" />
      </svg>
    );
  }

  if (href === "/products") {
    return (
      <svg {...common}>
        <path d="M12 3 3 7.5 12 12l9-4.5z" />
        <path d="M3 7.5V17l9 4.5V12" />
        <path d="M21 7.5V17l-9 4.5" />
      </svg>
    );
  }

  if (href === "/orders") {
    return (
      <svg {...common}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    );
  }

  if (href === "/reports") {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 16v-5M12 16V7M16 16v-8" />
      </svg>
    );
  }

  if (href === "/customers") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M15 6h6M18 3v6" />
      </svg>
    );
  }

  if (href === "/employees") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.7" />
      </svg>
    );
  }

  if (href === "/roles") {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
        <path d="M9.5 12.5l1.8 1.8 3.2-3.6" />
      </svg>
    );
  }

  if (href === "/payments") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h3" />
      </svg>
    );
  }

  if (href === "/inventory") {
    return (
      <svg {...common}>
        <path d="M3 9.5 12 4l9 5.5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
        <path d="M9 20.5v-6h6v6" />
      </svg>
    );
  }

  if (href === "/account") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.55L21 8H6" />
    </svg>
  );
}

function SidebarContent({
  pathname,
  userLabel,
  isCustomer,
  canViewInventory,
  canViewPayments,
  canViewEmployees,
  canViewCustomers,
  canViewRoles,
  canViewReports,
  onNavigate,
}: {
  pathname: string;
  userLabel: string;
  isCustomer: boolean;
  canViewInventory: boolean;
  canViewPayments: boolean;
  canViewEmployees: boolean;
  canViewCustomers: boolean;
  canViewRoles: boolean;
  canViewReports: boolean;
  onNavigate?: () => void;
}) {
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.customerOnly && !isCustomer) {
      return false;
    }

    if ("requiresInventory" in item && item.requiresInventory && !canViewInventory) {
      return false;
    }

    if ("requiresPayments" in item && item.requiresPayments && !canViewPayments) {
      return false;
    }

    if ("requiresEmployees" in item && item.requiresEmployees && !canViewEmployees) {
      return false;
    }

    if ("requiresCustomers" in item && item.requiresCustomers && !canViewCustomers) {
      return false;
    }

    if ("requiresRoles" in item && item.requiresRoles && !canViewRoles) {
      return false;
    }

    return !("requiresReports" in item && item.requiresReports && !canViewReports);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
          CB
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Clothing Business</p>
          <p className="truncate text-xs text-slate-500">Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <NavIcon href={item.href} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <p className="truncate px-3 pb-2 text-xs text-slate-500">{userLabel}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M15 12H4M8 8l-4 4 4 4" />
              <path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
            </svg>
            Sign outt
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  userLabel,
  unreadNotificationCount,
  isCustomer,
  canViewInventory,
  canViewPayments,
  canViewEmployees,
  canViewCustomers,
  canViewRoles,
  canViewReports,
  children,
}: {
  userLabel: string;
  unreadNotificationCount: number;
  isCustomer: boolean;
  canViewInventory: boolean;
  canViewPayments: boolean;
  canViewEmployees: boolean;
  canViewCustomers: boolean;
  canViewRoles: boolean;
  canViewReports: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const title = activeItem?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        <SidebarContent
          pathname={pathname}
          userLabel={userLabel}
          isCustomer={isCustomer}
          canViewInventory={canViewInventory}
          canViewPayments={canViewPayments}
          canViewEmployees={canViewEmployees}
          canViewCustomers={canViewCustomers}
          canViewRoles={canViewRoles}
          canViewReports={canViewReports}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <SidebarContent
              pathname={pathname}
              userLabel={userLabel}
              isCustomer={isCustomer}
              canViewInventory={canViewInventory}
              canViewPayments={canViewPayments}
              canViewEmployees={canViewEmployees}
              canViewCustomers={canViewCustomers}
              canViewRoles={canViewRoles}
              canViewReports={canViewReports}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Clothing Business Platform
              </p>
              <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationBell unreadCount={unreadNotificationCount} />
              <span className="hidden max-w-[220px] truncate text-sm text-slate-600 sm:block">
                {userLabel}
              </span>
              <form action={logoutAction} className="hidden sm:block">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
