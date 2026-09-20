import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";

export default async function LoginPage() {
  const account = await getCurrentAccount();

  if (account) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Clothing Business Platform</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Sign in</h1>
          <p className="mt-2 text-slate-600">Use your account credentials to continue.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
