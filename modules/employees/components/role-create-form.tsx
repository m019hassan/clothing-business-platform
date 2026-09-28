"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { createRoleAction, type RoleFormState } from "@/modules/employees/application/actions";

const initialState: RoleFormState = { ok: true, message: "" };

export type RoleCreateLabels = {
  name: string;
  code: string;
  codeHint: string;
  create: string;
  creating: string;
};

/** Creates an empty role; permissions are granted from the matrix afterwards. */
export function RoleCreateForm({ labels }: { labels: RoleCreateLabels }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createRoleAction, initialState);

  return (
    <form
      action={async (formData: FormData) => {
        await formAction(formData);
        router.refresh();
      }}
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <div>
        <label htmlFor="role-name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {labels.name}
        </label>
        <input
          id="role-name"
          name="name"
          type="text"
          required
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="role-code" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {labels.code}
        </label>
        <input
          id="role-code"
          name="code"
          type="text"
          required
          placeholder="STORE_MANAGER"
          className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
        <p className="mt-1 text-xs text-slate-400">{labels.codeHint}</p>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? labels.creating : labels.create}
      </button>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={["w-full text-sm", state.ok ? "text-emerald-700" : "text-rose-700"].join(" ")}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
