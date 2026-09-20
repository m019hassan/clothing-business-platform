import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  return (
    <AppShell
      userLabel={account.email ?? account.phone}
      isCustomer={account.accountType === "CUSTOMER"}
      canViewInventory={permissions.has(PERMISSIONS.INVENTORY_VIEW)}
      canViewPayments={permissions.has(PERMISSIONS.PAYMENTS_VIEW)}
      canViewEmployees={permissions.has(PERMISSIONS.EMPLOYEES_VIEW)}
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
