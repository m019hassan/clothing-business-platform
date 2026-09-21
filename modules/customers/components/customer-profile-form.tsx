"use client";

import { useActionState } from "react";

import { updateProfileAction, type ProfileFormState } from "@/modules/customers/application/actions";
import type { CustomerProfileView } from "@/modules/customers/application/profile";

const initialState: ProfileFormState = { ok: true, message: "" };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500";

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

export function CustomerProfileForm({ profile }: { profile: CustomerProfileView }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={profile.firstName}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input id="lastName" name="lastName" type="text" defaultValue={profile.lastName ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="gender" className={labelClass}>
            Gender
          </label>
          <select id="gender" name="gender" defaultValue={profile.gender ?? ""} className={inputClass}>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="birthDate" className={labelClass}>
            Birth date
          </label>
          <input id="birthDate" name="birthDate" type="date" defaultValue={profile.birthDate ?? ""} className={inputClass} />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Leave a field empty to clear it. Customer code ({profile.customerCode}) and classification are managed by the
        store.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save profile"}
        </button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={["text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
