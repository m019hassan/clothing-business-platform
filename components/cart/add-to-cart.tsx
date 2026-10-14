"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";
import type { CartView } from "@/modules/cart/types";
import { ShoppingCartIcon, CheckIcon, SparklesIcon } from "@/components/ui/icons";
import { SizeGuideModal } from "@/components/products/size-guide-modal";

export type AddToCartVariant = {
  id: string;
  sku: string;
  label: string;
  size?: string | null;
  color?: string | null;
  unitPrice: string;
  availableQuantity: number;
  sellable: boolean;
};

export type AddToCartLabels = {
  title: string;
  variant: string;
  quantity: string;
  add: string;
  adding: string;
  selectVariant: string;
  customersOnly: string;
  customersOnlyHint: string;
  notAvailable: string;
  notAvailableHint: string;
  viewCart: string;
};

export function AddToCart({
  variants,
  currency,
  canPurchase,
  labels,
  errors,
  isArabic = true,
}: {
  variants: AddToCartVariant[];
  currency: string;
  canPurchase: boolean;
  labels: AddToCartLabels;
  errors?: ApiErrorLabels;
  isArabic?: boolean;
}) {
  const router = useRouter();
  const sellableVariants = variants.filter((variant) => variant.sellable);
  const [variantId, setVariantId] = useState(sellableVariants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const selected = sellableVariants.find((variant) => variant.id === variantId) ?? null;

  async function addToCart() {
    if (!selected) {
      setError(labels.selectVariant);
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

      setSuccess(`${labels.add}: ${quantity} × ${selected.sku}`);
      setQuantity(1);
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, errors));
    } finally {
      setPending(false);
    }
  }

  if (!canPurchase) {
    return null;
  }

  if (sellableVariants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{labels.notAvailable}</p>
        <p className="mt-1 text-xs text-slate-500">{labels.notAvailableHint}</p>
      </div>
    );
  }

  // Scarcity threshold
  const isLowStock = selected && selected.availableQuantity > 0 && selected.availableQuantity <= 3;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
        {/* Header with Title and Size Guide trigger */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{labels.title}</h3>
          <button
            type="button"
            onClick={() => setIsSizeGuideOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            <span>📏</span>
            <span>{isArabic ? "دليل المقاسات" : "Size Guide"}</span>
          </button>
        </div>

        {/* Variant selection cards/chips */}
        <div className="mt-3">
          <span className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
            {labels.variant}
          </span>
          <div className="flex flex-wrap gap-2">
            {sellableVariants.map((variant) => {
              const isSelected = variant.id === variantId;
              const displayLabel = variant.size ? `${variant.size}${variant.color ? ` - ${variant.color}` : ""}` : variant.label;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    setVariantId(variant.id);
                    setError(null);
                  }}
                  className={`relative flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {isSelected ? <CheckIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span>{displayLabel}</span>
                  <span className={`text-[10px] font-normal ${isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400"}`}>
                    ({variant.unitPrice} {currency})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Low Stock Scarcity Alert */}
        {isLowStock ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isArabic
                ? `⚡ تبقّت ${selected.availableQuantity} قطع فقط في المخزون!`
                : `⚡ Only ${selected.availableQuantity} left in stock!`}
            </span>
          </div>
        ) : null}

        {/* Quantity and Add to Cart action */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-10 text-center font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) =>
                  selected ? Math.min(selected.availableQuantity, q + 1) : q + 1
                )
              }
              disabled={selected ? quantity >= selected.availableQuantity : false}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={pending || !selected}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>{pending ? labels.adding : labels.add}</span>
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <div
            role="status"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <div className="flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
            <Link href="/cart" className="underline underline-offset-2">
              {labels.viewCart} ←
            </Link>
          </div>
        ) : null}
      </div>

      {/* Sticky Mobile Bar */}
      {selected ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 p-3 px-4 shadow-lg backdrop-blur-md sm:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">
              {selected.size ? `${selected.size} · ` : ""}
              {selected.availableQuantity > 0 ? (
                <span className="text-emerald-600 font-semibold">{isArabic ? "متوفر" : "In Stock"}</span>
              ) : (
                <span className="text-rose-600">{isArabic ? "نفد" : "Out"}</span>
              )}
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {selected.unitPrice} {currency}
            </p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={pending || !selected}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>{pending ? labels.adding : labels.add}</span>
          </button>
        </div>
      ) : null}

      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        isArabic={isArabic}
      />
    </>
  );
}
