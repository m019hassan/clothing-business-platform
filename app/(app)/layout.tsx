import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getUnreadNotificationCount } from "@/modules/notification/application/notifications";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const [permissions, unreadNotificationCount] = await Promise.all([
    getCurrentPermissions(),
    getUnreadNotificationCount(account),
  ]);

  return (
    <AppShell
      userLabel={account.email ?? account.phone}
      unreadNotificationCount={unreadNotificationCount}
      isCustomer={account.accountType === "CUSTOMER"}
      canViewInventory={permissions.has(PERMISSIONS.INVENTORY_VIEW)}
      canViewPayments={permissions.has(PERMISSIONS.PAYMENTS_VIEW)}
      canViewEmployees={permissions.has(PERMISSIONS.EMPLOYEES_VIEW)}
      canViewCustomers={permissions.has(PERMISSIONS.CUSTOMERS_VIEW)}
      canViewShipping={permissions.has(PERMISSIONS.SHIPPING_MANAGE)}
      canViewRoles={permissions.has(PERMISSIONS.ROLES_VIEW)}
      canViewReports={
        permissions.has(PERMISSIONS.ORDERS_VIEW) ||
        permissions.has(PERMISSIONS.PAYMENTS_VIEW) ||
        permissions.has(PERMISSIONS.INVENTORY_VIEW)
      }
    >
      {children}
    </AppShell>
  );
}
