"use client";

import { useActionState } from "react";

import { updateAccountPreferencesAction } from "@/modules/notification/application/actions";
import type { AccountPreferenceView, PreferencesFormState } from "@/modules/notification/types";

const initialState: PreferencesFormState = { ok: true, message: "" };

const TIMEZONE_SUGGESTIONS = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Cairo",
  "Asia/Amman",
  "Europe/London",
  "UTC",
];

export function AccountPreferencesForm({
  preferences,
  canManageMarketing,
}: {
  preferences: AccountPreferenceView;
  canManageMarketing: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateAccountPreferencesAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredLanguage" className="mb-2 block text-sm font-medium text-slate-700">
            Language
          </label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            defaultValue={preferences.preferredLanguage}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ar">العربية (ar)</option>
            <option value="en">English (en)</option>
          </select>
        </div>

        <div>
          <label htmlFor="timezone" className="mb-2 block text-sm font-medium text-slate-700">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            list="timezoneSuggestions"
            defaultValue={preferences.timezone}
            placeholder="Asia/Riyadh"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
          <datalist id="timezoneSuggestions">
            {TIMEZONE_SUGGESTIONS.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </div>
      </div>

      {canManageMarketing ? (
        <div className="flex items-start gap-3">
          <input type="hidden" name="marketingConsentField" value="1" />
          <input
            id="marketingConsent"
            name="marketingConsent"
            type="checkbox"
            defaultChecked={preferences.marketingConsent === true}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="marketingConsent" className="text-sm text-slate-700">
            I agree to receive marketing messages about products and offers.
          </label>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Marketing consent applies to customer accounts only.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save preferences"}
        </button>
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={[
              "text-sm",
              state.ok ? "text-emerald-700" : "text-rose-700",
            ].join(" ")}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
