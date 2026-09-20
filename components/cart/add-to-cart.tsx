"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest } from "@/src/lib/api";
import type { CartView } from "@/modules/cart/types";

export type AddToCartVariant = {
  id: string;
  sku: string;
  label: string;
  unitPrice: string;
  availableQuantity: number;
  sellable: boolean;
};

export function AddToCart({
  variants,
  currency,
  canPurchase,
}: {
  variants: AddToCartVariant[];
  currency: string;
  canPurchase: boolean;
}) {
  const router = useRouter();
  const sellableVariants = variants.filter((variant) => variant.sellable);
  const [variantId, setVariantId] = useState(sellableVariants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selected = sellableVariants.find((variant) => variant.id === variantId) ?? null;

  async function addToCart() {
    if (!selected) {
      setError("Select a variant first.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest<{ cart: CartView }>("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId: selected.id, quantity }),
      });

      setSuccess(`Added ${quantity} × ${selected.sku} to your cart.`);
      setQuantity(1);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  }

  if (!canPurchase) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
        <p className="text-sm font-medium text-slate-700">Customer accounts only</p>
        <p className="mt-1 text-sm text-slate-500">
          Shopping cart actions are available for customer accounts. This account type cannot purchase.
        </p>
      </div>
    );
  }

  if (sellableVariants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">
        <p className="text-sm font-medium text-slate-700">Not available for purchase</p>
        <p className="mt-1 text-sm text-slate-500">
          This product has no active variant with available stock.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-900">Add to cart</h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Variant</span>
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sellableVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} — {variant.unitPrice} {currency} ({variant.availableQuantity} available)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Quantity</span>
          <input
            type="number"
            min={1}
            max={selected ? Math.max(selected.availableQuantity, 1) : 1}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <button
          type="button"
          onClick={addToCart}
          disabled={pending || !selected}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>

      {selected ? (
        <p className="mt-3 text-xs text-slate-500">
          {selected.availableQuantity > 0
            ? `${selected.availableQuantity} available for ${selected.sku}.`
            : `${selected.sku} is out of stock.`}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
          <Link href="/cart" className="font-semibold underline">
            View cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}
