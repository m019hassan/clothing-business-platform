import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  return (
    <AppShell userLabel={account.email ?? account.phone}>
      {children}
    </AppShell>
  );
}
