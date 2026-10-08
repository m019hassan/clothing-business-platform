"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";

import { logoutAction } from "@/modules/auth/application/actions";
import { NotificationBell } from "@/modules/notification/components/notification-bell";
import type { Dictionary } from "@/src/lib/i18n/dictionaries";
import type { Locale } from "@/src/lib/i18n";
import {
  BarChart3Icon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ListIcon,
  LogOutIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StoreIcon,
  TruckIcon,
  UserCheckIcon,
  UserIcon,
  UsersIcon,
  WarehouseIcon,
  XIcon,
} from "@/components/ui/icons";

import { LocaleSwitcher } from "./locale-switcher";

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", customerOnly: false },
  { href: "/reports", key: "reports", customerOnly: false, requiresReports: true },
  { href: "/products", key: "products", customerOnly: false },
  { href: "/orders", key: "orders", customerOnly: true },
  { href: "/cart", key: "cart", customerOnly: true },
  { href: "/account", key: "account", customerOnly: false },
  { href: "/inventory", key: "inventory", customerOnly: false, requiresInventory: true },
  { href: "/payments", key: "payments", customerOnly: false, requiresPayments: true },
  { href: "/pos", key: "pos", customerOnly: false, distributorOnly: true },
  { href: "/admin", key: "admin", customerOnly: false, requiresUsers: true },
  { href: "/deliveries", key: "deliveries", customerOnly: false, requiresShipping: true },
  { href: "/customers", key: "customers", customerOnly: false, requiresCustomers: true },
  { href: "/employees", key: "employees", customerOnly: false, requiresEmployees: true },
  { href: "/roles", key: "roles", customerOnly: false, requiresRoles: true },
] as const;

/** Links shown indented under the products entry. */
const PRODUCT_SUB_ITEMS = [
  { href: "/products/categories", key: "productCategories" },
  { href: "/products/colors", key: "productColors" },
  { href: "/products/sizes", key: "productSizes" },
  { href: "/products/materials", key: "productMaterials" },
] as const;

/** Links shown indented under the inventory entry. */
const INVENTORY_SUB_ITEMS = [
  { href: "/inventory/movements", key: "inventoryMovements" },
  { href: "/inventory/warehouses", key: "inventoryWarehouses" },
] as const;

/** Links shown indented under the point-of-sale entry. */
const POS_SUB_ITEMS = [{ href: "/pos/history", key: "posHistory" }] as const;

/** Links shown indented under the admin entry. */
const ADMIN_SUB_ITEMS = [
  { href: "/admin", key: "adminAccounts", requiresUsers: true },
  { href: "/admin/branches", key: "adminBranches", requiresBranches: true },
  { href: "/audit", key: "audit", requiresAudit: true },
] as const;

function NavIcon({ href, className = "h-5 w-5 shrink-0" }: { href: string; className?: string }) {
  if (href === "/dashboard") return <LayoutDashboardIcon className={className} />;
  if (href === "/products") return <ShoppingBagIcon className={className} />;
  if (href === "/orders") return <FileTextIcon className={className} />;
  if (href === "/reports") return <BarChart3Icon className={className} />;
  if (href === "/pos") return <StoreIcon className={className} />;
  if (href === "/admin") return <ShieldCheckIcon className={className} />;
  if (href === "/deliveries") return <TruckIcon className={className} />;
  if (href === "/customers") return <UsersIcon className={className} />;
  if (href === "/employees") return <UserCheckIcon className={className} />;
  if (href === "/roles") return <ShieldCheckIcon className={className} />;
  if (href === "/payments") return <CreditCardIcon className={className} />;
  if (href === "/inventory") return <WarehouseIcon className={className} />;
  if (href === "/account") return <UserIcon className={className} />;
  return <ShoppingCartIcon className={className} />;
}

function SidebarContent({
  navLabels,
  shellLabels,
  pathname,
  userLabel,
  isCustomer,
  isDistributor,
  canViewInventory,
  canViewPayments,
  canViewEmployees,
  canViewCustomers,
  canViewShipping,
  canViewUsers,
  canViewRoles,
  canViewAudit,
  canViewBranches,
  canViewReports,
  canViewProducts,
  onNavigate,
}: {
  navLabels: Dictionary["nav"];
  shellLabels: Dictionary["shell"];
  pathname: string;
  userLabel: string;
  isCustomer: boolean;
  isDistributor: boolean;
  canViewInventory: boolean;
  canViewPayments: boolean;
  canViewEmployees: boolean;
  canViewCustomers: boolean;
  canViewShipping: boolean;
  canViewUsers: boolean;
  canViewRoles: boolean;
  canViewAudit: boolean;
  canViewBranches: boolean;
  canViewReports: boolean;
  canViewProducts: boolean;
  onNavigate?: () => void;
}) {
  const adminSubItems = ADMIN_SUB_ITEMS.filter((sub) => {
    if ("requiresUsers" in sub && sub.requiresUsers) return canViewUsers;
    if ("requiresBranches" in sub && sub.requiresBranches) return canViewBranches;
    if ("requiresAudit" in sub && sub.requiresAudit) return canViewAudit;
    return true;
  });

  const renderInventorySubItems = () => (
    <div className="ms-4 my-1 space-y-1 border-s-2 border-slate-200 ps-3">
      {INVENTORY_SUB_ITEMS.map((sub) => {
        const isSubActive = pathname === sub.href;

        return (
          <Link
            key={sub.href}
            href={sub.href}
            onClick={onNavigate}
            aria-current={isSubActive ? "page" : undefined}
            className={[
              "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              isSubActive
                ? "bg-slate-100 font-semibold text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {navLabels[sub.key as keyof typeof navLabels]}
          </Link>
        );
      })}
    </div>
  );

  const renderPosSubItems = () => (
    <div className="ms-4 my-1 space-y-1 border-s-2 border-slate-200 ps-3">
      {POS_SUB_ITEMS.map((sub) => {
        const isSubActive = pathname === sub.href;

        return (
          <Link
            key={sub.href}
            href={sub.href}
            onClick={onNavigate}
            aria-current={isSubActive ? "page" : undefined}
            className={[
              "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              isSubActive
                ? "bg-slate-100 font-semibold text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {navLabels[sub.key as keyof typeof navLabels]}
          </Link>
        );
      })}
    </div>
  );

  const renderProductSubItems = () => (
    <div className="ms-4 my-1 space-y-1 border-s-2 border-slate-200 ps-3">
      {PRODUCT_SUB_ITEMS.map((sub) => {
        const isSubActive = pathname === sub.href;

        return (
          <Link
            key={sub.href}
            href={sub.href}
            onClick={onNavigate}
            aria-current={isSubActive ? "page" : undefined}
            className={[
              "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              isSubActive
                ? "bg-slate-100 font-semibold text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {navLabels[sub.key as keyof typeof navLabels]}
          </Link>
        );
      })}
    </div>
  );

  const parentVisible = canViewUsers;

  const renderAdminSubItems = () =>
    adminSubItems.length === 0 ? null : (
      <div className="ms-4 my-1 space-y-1 border-s-2 border-slate-200 ps-3">
        {adminSubItems.map((sub) => {
          const isSubActive = pathname === sub.href;

          return (
            <Link
              key={sub.href}
              href={sub.href}
              onClick={onNavigate}
              aria-current={isSubActive ? "page" : undefined}
              className={[
                "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                isSubActive
                  ? "bg-slate-100 font-semibold text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              ].join(" ")}
            >
              {navLabels[sub.key as keyof typeof navLabels]}
            </Link>
          );
        })}
      </div>
    );

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.customerOnly && !isCustomer) return false;
    if ("requiresInventory" in item && item.requiresInventory && !canViewInventory) return false;
    if ("requiresPayments" in item && item.requiresPayments && !canViewPayments) return false;
    if ("requiresEmployees" in item && item.requiresEmployees && !canViewEmployees) return false;
    if ("requiresCustomers" in item && item.requiresCustomers && !canViewCustomers) return false;
    if ("requiresShipping" in item && item.requiresShipping && !canViewShipping) return false;
    if ("requiresUsers" in item && item.requiresUsers && !canViewUsers) return false;
    if ("distributorOnly" in item && item.distributorOnly && !isDistributor) return false;
    if ("requiresRoles" in item && item.requiresRoles && !canViewRoles) return false;
    if ("requiresAudit" in item && item.requiresAudit && !canViewAudit) return false;
    return !("requiresReports" in item && item.requiresReports && !canViewReports);
  });

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white font-bold text-sm tracking-wider shadow-sm">
          CB
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-slate-950">Clothing Business</p>
          <p className="truncate text-[11px] font-medium text-slate-400">Enterprise Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const isAdminEntry = item.href === "/admin";
          const isProductEntry = item.href === "/products";
          const isPosEntry = item.href === "/pos";
          const isInventoryEntry = item.href === "/inventory";

          return (
            <Fragment key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                <NavIcon
                  href={item.href}
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                <span className="truncate">{navLabels[item.key]}</span>
              </Link>

              {isAdminEntry ? renderAdminSubItems() : null}
              {isProductEntry && canViewProducts ? renderProductSubItems() : null}
              {isPosEntry && isDistributor ? renderPosSubItems() : null}
              {isInventoryEntry && canViewInventory ? renderInventorySubItems() : null}
            </Fragment>
          );
        })}

        {adminSubItems.length > 0 && !parentVisible ? (
          <div className="ms-4 my-1 space-y-1 border-s-2 border-slate-200 ps-3">
            <p className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {navLabels.admin}
            </p>
            {adminSubItems.map((sub) => {
              const isSubActive = pathname === sub.href;

              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={onNavigate}
                  aria-current={isSubActive ? "page" : undefined}
                  className={[
                    "block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isSubActive
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  {navLabels[sub.key as keyof typeof navLabels]}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 mb-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-700">
            {userLabel.charAt(0).toUpperCase()}
          </div>
          <p className="truncate text-xs font-medium text-slate-700">{userLabel}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOutIcon className="h-4 w-4 shrink-0 text-rose-500" />
            {shellLabels.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}

type ShellLabels = { nav: Dictionary["nav"]; shell: Dictionary["shell"] };

export function AppShell({
  labels,
  locale,
  userLabel,
  unreadNotificationCount,
  isCustomer,
  isDistributor,
  canViewInventory,
  canViewPayments,
  canViewEmployees,
  canViewCustomers,
  canViewShipping,
  canViewUsers,
  canViewRoles,
  canViewAudit,
  canViewBranches,
  canViewReports,
  canViewProducts,
  children,
}: {
  labels: ShellLabels;
  locale: Locale;
  userLabel: string;
  unreadNotificationCount: number;
  isCustomer: boolean;
  isDistributor: boolean;
  canViewInventory: boolean;
  canViewPayments: boolean;
  canViewEmployees: boolean;
  canViewCustomers: boolean;
  canViewShipping: boolean;
  canViewUsers: boolean;
  canViewRoles: boolean;
  canViewAudit: boolean;
  canViewBranches: boolean;
  canViewReports: boolean;
  canViewProducts: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeItem = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const title = labels.nav[activeItem?.key ?? "dashboard"];

  return (
    <div className="min-h-screen bg-slate-100/70 lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-e border-slate-200/80 bg-white lg:sticky lg:top-0 lg:block lg:h-screen print:hidden">
        <SidebarContent
          navLabels={labels.nav}
          shellLabels={labels.shell}
          pathname={pathname}
          userLabel={userLabel}
          isCustomer={isCustomer}
          canViewInventory={canViewInventory}
          canViewPayments={canViewPayments}
          canViewEmployees={canViewEmployees}
          canViewCustomers={canViewCustomers}
          canViewShipping={canViewShipping}
          canViewUsers={canViewUsers}
          isDistributor={isDistributor}
          canViewRoles={canViewRoles}
          canViewAudit={canViewAudit}
          canViewBranches={canViewBranches}
          canViewReports={canViewReports}
          canViewProducts={canViewProducts}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 print:hidden lg:hidden">
          <button
            type="button"
            aria-label={labels.shell.closeNavigation}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85%] bg-white shadow-2xl">
            <div className="absolute end-3 top-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label={labels.shell.closeNavigation}
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              navLabels={labels.nav}
              shellLabels={labels.shell}
              pathname={pathname}
              userLabel={userLabel}
              isCustomer={isCustomer}
              canViewInventory={canViewInventory}
              canViewPayments={canViewPayments}
              canViewEmployees={canViewEmployees}
              canViewCustomers={canViewCustomers}
              canViewShipping={canViewShipping}
              canViewUsers={canViewUsers}
              isDistributor={isDistributor}
              canViewRoles={canViewRoles}
              canViewAudit={canViewAudit}
              canViewBranches={canViewBranches}
              canViewReports={canViewReports}
              canViewProducts={canViewProducts}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md print:hidden">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={labels.shell.openNavigation}
            >
              <ListIcon className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {labels.shell.brand}
              </p>
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
            </div>

            <div className="ms-auto flex items-center gap-2.5">
              <NotificationBell
                unreadCount={unreadNotificationCount}
                labels={{ notifications: labels.shell.notifications, unread: labels.shell.unread }}
              />
              <LocaleSwitcher locale={locale} label={labels.shell.language} />
              <div className="hidden items-center gap-2 border-s border-slate-200 ps-3 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                  {userLabel.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                  {userLabel}
                </span>
              </div>
              <form action={logoutAction} className="hidden sm:block">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  {labels.shell.signOut}
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
