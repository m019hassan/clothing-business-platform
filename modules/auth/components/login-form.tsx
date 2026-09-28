"use client";

import { useActionState } from "react";

import { loginAction } from "@/modules/auth/application/actions";
import type { LoginResult } from "@/modules/auth/types";

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
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-slate-700">
          {labels.identifier}
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      {failureMessage ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {failureMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? labels.signingIn : labels.signIn}
      </button>
    </form>
  );
}
