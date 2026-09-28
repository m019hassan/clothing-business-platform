"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import type { RoleWithPermissionsView } from "@/modules/employees/types";

export type RoleSettingsLabels = {
  name: string;
  description: string;
  active: string;
  save: string;
  saving: string;
  saved: string;
  remove: string;
  removeConfirm: string;
  errors?: ApiErrorLabels;
};

/** Renames a role, edits its description, toggles it, or deletes it when free. */
export function RoleSettingsForm({
  role,
  labels,
  canDelete,
}: {
  role: RoleWithPermissionsView;
  labels: RoleSettingsLabels;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [isActive, setIsActive] = useState(role.isActive);
  const [pending, setPending] = useState<null | "save" | "remove">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending("save");
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/roles/${role.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, description, isActive }),
      });

      setMessage(labels.saved);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!window.confirm(labels.removeConfirm)) {
      return;
    }

    setPending("remove");
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/roles/${role.id}`, { method: "DELETE" });
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.name}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.description}</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {labels.active}
        </label>

        <button
          type="button"
          onClick={save}
          disabled={pending !== null}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "save" ? labels.saving : labels.save}
        </button>

        {canDelete ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending !== null}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
          >
            {pending === "remove" ? labels.saving : labels.remove}
          </button>
        ) : null}

        {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
