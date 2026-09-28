import { redirect } from "next/navigation";

import { LocaleSwitcher } from "@/components/app-shell/locale-switcher";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function LoginPage() {
  const account = await getCurrentAccount();

  if (account) {
    redirect("/dashboard");
  }

  const { locale, t } = await getInterfaceLanguage();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <div className="absolute top-6 end-6">
        <LocaleSwitcher locale={locale} label={t.shell.language} />
      </div>
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.auth.appName}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{t.auth.signInTitle}</h1>
          <p className="mt-2 text-slate-600">{t.auth.signInSubtitle}</p>
        </div>
        <LoginForm
          labels={{
            identifier: t.auth.identifier,
            password: t.auth.password,
            signIn: t.auth.signIn,
            signingIn: t.auth.signingIn,
          }}
        />
      </section>
    </main>
  );
}
