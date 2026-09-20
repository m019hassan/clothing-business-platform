import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

export default async function Home() {
  const account = await getCurrentAccount();

  redirect(account ? "/dashboard" : "/login");
}
