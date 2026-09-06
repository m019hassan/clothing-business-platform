import { redirect } from "next/navigation";

import { logoutAction } from "@/modules/auth/application/actions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

export default async function AdminPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Authenticated area</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Welcome back</h1>
            <p className="mt-2 text-slate-600">{account.email ?? account.phone}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
