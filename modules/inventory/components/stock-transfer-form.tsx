"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { TransferTarget } from "@/modules/inventory/application/transfers";
import { apiRequest } from "@/src/lib/api";

type Labels = {
  transfer: string;
  transferTitle: string;
  availableHere: string;
  item: string;
  from: string;
  toBranch: string;
  quantity: string;
  all: string;
  confirmTransfer: string;
  cancel: string;
  noTargets: string;
};

/**
 * The move dialog: a centred panel over the page instead of a form squeezed into the
 * table. It names the item, shows what the source holds, offers only branches that can
 * receive (the source branch is left out) and a button that fills the whole quantity.
 */
export function StockTransferForm({
  variantId,
  fromWarehouseId,
  fromWarehouseName,
  fromBranchId,
  productName,
  attributes,
  available,
  sku,
  targets,
  labels,
}: {
  variantId: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  fromBranchId: string | null;
  productName: string;
  attributes: string;
  available: number;
  sku: string;
  targets: TransferTarget[];
  labels: Labels;
}) {
  const router = useRouter();
  const options = targets.filter((target) => target.branchId !== fromBranchId);
  const [open, setOpen] = useState(false);
  const [toBranchId, setToBranchId] = useState(options[0]?.branchId ?? "");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const openDialog = () => {
    setToBranchId(options[0]?.branchId ?? "");
    setQuantity("");
    setError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiRequest("/api/inventory/transfer", {
        method: "POST",
        body: JSON.stringify({ variantId, fromWarehouseId, toBranchId, quantity: Number(quantity) }),
      });
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {labels.transfer}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.transferTitle}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div>
              <h3 className="text-base font-semibold text-slate-900">{labels.transferTitle}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {productName}
                {attributes ? <span className="text-slate-500"> · {attributes}</span> : null}
              </p>
              <p className="font-mono text-[11px] text-slate-400">{sku}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">{labels.from}</dt>
                <dd className="font-medium text-slate-800">{fromWarehouseName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">{labels.availableHere}</dt>
                <dd className="font-bold text-slate-900">{available}</dd>
              </div>
            </dl>

            {options.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{labels.noTargets}</p>
            ) : (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{labels.toBranch}</span>
                  <select
                    value={toBranchId}
                    onChange={(event) => setToBranchId(event.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                  >
                    {options.map((target) => (
                      <option key={target.branchId} value={target.branchId}>
                        {target.branchName} ({target.branchCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{labels.quantity}</span>
                  <div className="flex items-center gap-2">
                    <input
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      inputMode="numeric"
                      required
                      min={1}
                      max={available}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(String(available))}
                      className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {labels.all}
                    </button>
                  </div>
                </label>
              </>
            )}

            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={busy || options.length === 0}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {labels.confirmTransfer}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
