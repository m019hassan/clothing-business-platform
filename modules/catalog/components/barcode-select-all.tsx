"use client";

/** Ticks every product checkbox in the enclosing form (respects the search). */
export function BarcodeSelectAll({ label }: { label: string }) {
  return (
    <label className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
      <input
        type="checkbox"
        onChange={(event) => {
          const form = event.currentTarget.form;

          if (!form) {
            return;
          }

          form.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
            box.checked = event.currentTarget.checked;
          });
        }}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}
