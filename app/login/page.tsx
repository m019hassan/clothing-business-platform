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
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100/60 px-4 py-12">
      {/* Top right language switcher */}
      <div className="absolute top-6 end-6 z-10">
        <LocaleSwitcher locale={locale} label={t.shell.language} />
      </div>

      <div className="w-full max-w-md">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-lg">
          <div className="mb-8 text-center sm:text-start">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white font-bold text-base shadow-sm">
              CB
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-600">
              {t.auth.appName}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              {t.auth.signInTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t.auth.signInSubtitle}
            </p>
          </div>

          <LoginForm
            labels={{
              identifier: t.auth.identifier,
              password: t.auth.password,
              signIn: t.auth.signIn,
              signingIn: t.auth.signingIn,
              invalidCredentials: t.auth.invalidCredentials,
              missingFields: t.auth.missingFields,
              rateLimited: t.auth.rateLimited,
              unavailable: t.auth.unavailable,
            }}
          />
        </section>
      </div>
    </main>
  );
}
