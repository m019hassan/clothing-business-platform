"use client";

import { useActionState } from "react";

import { updateNotificationPreferencesAction } from "@/modules/notification/application/actions";
import type { NotificationPreferenceView, PreferencesFormState } from "@/modules/notification/types";

const initialState: PreferencesFormState = { ok: true, message: "" };

const TYPE_LABELS: Record<string, string> = {
  ORDER: "Order updates",
  PAYMENT: "Payment updates",
  DELIVERY: "Delivery updates",
};

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferenceView[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {preferences.map((preference) => (
        <div key={preference.type} className="flex items-start gap-3">
          <input
            id={`inApp_${preference.type}`}
            name={`inApp_${preference.type}`}
            type="checkbox"
            defaultChecked={preference.inApp}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor={`inApp_${preference.type}`} className="text-sm text-slate-700">
            {TYPE_LABELS[preference.type] ?? preference.type} — in-app
          </label>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Save notification preferences"}
        </button>
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
