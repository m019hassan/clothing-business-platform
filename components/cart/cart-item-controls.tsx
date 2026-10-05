"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import type { CartView } from "@/modules/cart/types";
import { Loader2Icon, XIcon } from "@/components/ui/icons";

export type CartItemControlLabels = {
  decrease: string;
  increase: string;
  removing: string;
  remove: string;
  updating: string;
};

export function CartItemControls({
  itemId,
  quantity,
  labels,
  errors,
}: {
  itemId: string;
  quantity: number;
  labels: CartItemControlLabels;
  errors?: ApiErrorLabels;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"decrease" | "increase" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "decrease" | "increase" | "remove") {
    setPending(action);
    setError(null);

    try {
      if (action === "remove") {
        await apiRequest<{ removed: boolean; cart: CartView }>(`/api/cart/items/${itemId}`, {
          method: "DELETE",
        });
      } else {
        const nextQuantity = action === "increase" ? quantity + 1 : Math.max(quantity - 1, 1);

        await apiRequest<{ cart: CartView }>(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantity: nextQuantity }),
        });
      }

      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, errors));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-xs">
          <button
            type="button"
            aria-label={labels.decrease}
            onClick={() => run("decrease")}
            disabled={pending !== null || quantity <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-s-xl text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            −
          </button>
          <span className="min-w-8 px-2 text-center text-xs font-bold text-slate-900">
            {pending === "increase" || pending === "decrease" ? (
              <Loader2Icon className="mx-auto h-3 w-3 animate-spin text-slate-400" />
            ) : (
              quantity
            )}
          </span>
          <button
            type="button"
            aria-label={labels.increase}
            onClick={() => run("increase")}
            disabled={pending !== null}
            className="flex h-8 w-8 items-center justify-center rounded-e-xl text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => run("remove")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "remove" ? (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-rose-500" />
          ) : (
            <XIcon className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span>{pending === "remove" ? labels.removing : labels.remove}</span>
        </button>
      </div>

      {pending === "increase" || pending === "decrease" ? (
        <p className="text-[11px] text-slate-400">{labels.updating}</p>
      ) : null}

      {error ? (
        <p role="alert" className="max-w-xs text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
