"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { CartView } from "@/modules/cart/types";

export function CartItemControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
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
      setError(apiErrorMessage(requestError));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => run("decrease")}
            disabled={pending !== null || quantity <= 1}
            className="px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            −
          </button>
          <span className="min-w-10 border-x border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-900">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => run("increase")}
            disabled={pending !== null}
            className="px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => run("remove")}
          disabled={pending !== null}
          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "remove" ? "Removing…" : "Remove"}
        </button>
      </div>

      {pending === "increase" || pending === "decrease" ? (
        <p className="text-xs text-slate-400">Updating…</p>
      ) : null}

      {error ? (
        <p role="alert" className="max-w-xs text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
