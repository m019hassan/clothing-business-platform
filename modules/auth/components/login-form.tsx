"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/modules/auth/application/actions";
import type { LoginResult } from "@/modules/auth/types";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, UserIcon } from "@/components/ui/icons";

const initialState: LoginResult = { success: false, message: "" };

export type LoginFormLabels = {
  identifier: string;
  password: string;
  signIn: string;
  signingIn: string;
  invalidCredentials: string;
  missingFields: string;
  rateLimited: string;
  unavailable: string;
};

export function LoginForm({ labels }: { labels: LoginFormLabels }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  // The action returns a stable reason; the message stays English as a fallback.
  const failureMessage = state.message
    ? state.reason === "INVALID_CREDENTIALS"
      ? labels.invalidCredentials
      : state.reason === "MISSING_FIELDS"
        ? labels.missingFields
        : state.reason === "RATE_LIMITED"
          ? labels.rateLimited
          : state.reason === "UNAVAILABLE"
            ? labels.unavailable
            : state.message
    : "";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          {labels.identifier}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
            <UserIcon className="h-4 w-4" />
          </span>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          {labels.password}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
            <LockIcon className="h-4 w-4" />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 ps-10 pe-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {failureMessage ? (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{failureMessage}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <span>{labels.signingIn}</span>
          </>
        ) : (
          labels.signIn
        )}
      </button>
    </form>
  );
}
