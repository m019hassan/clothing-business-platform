"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiRequest } from "@/src/lib/api";

type Labels = {
  remove: string;
  removeConfirm: string;
  edit: string;
  name: string;
  nameEn: string;
  code: string;
  save: string;
  cancel: string;
  saving: string;
};

export function ColorRowActions({
  colorId,
  name,
  nameEn,
  hex,
  labels,
}: {
  colorId: string;
  name: string;
  nameEn: string | null;
  hex: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftNameEn, setDraftNameEn] = useState(nameEn ?? "");
  const [draftHex, setDraftHex] = useState(hex);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/colors/${colorId}`, {
        method: "PUT",
        body: JSON.stringify({ name: draftName, nameEn: draftNameEn, hex: draftHex }),
      });
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(labels.removeConfirm.replace("{name}", name))) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await apiRequest(`/api/colors/${colorId}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          aria-label={labels.name}
          required
          minLength={2}
          maxLength={40}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs"
        />
        <input
          value={draftNameEn}
          onChange={(event) => setDraftNameEn(event.target.value)}
          aria-label={labels.nameEn}
          maxLength={40}
          className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs"
        />
        <input
          type="color"
          value={draftHex}
          onChange={(event) => setDraftHex(event.target.value)}
          aria-label={labels.code}
          className="h-7 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? labels.saving : labels.save}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
        >
          {labels.cancel}
        </button>
        {error ? <span className="w-full text-xs text-rose-600">{error}</span> : null}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        {labels.edit}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
      >
        {labels.remove}
      </button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
