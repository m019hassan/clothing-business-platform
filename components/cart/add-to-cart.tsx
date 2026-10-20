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
  outOfStock: boolean;
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
  colorHex,
  isArabic = true,
}: {
  variants: AddToCartVariant[];
  currency: string;
  canPurchase: boolean;
  labels: AddToCartLabels;
  errors?: ApiErrorLabels;
  colorHex?: Record<string, string>;
  isArabic?: boolean;
}) {
  const router = useRouter();
  const sellableVariants = variants.filter((variant) => variant.sellable);
  const orderableVariants = variants.filter((variant) => variant.sellable || variant.outOfStock);
  const [variantId, setVariantId] = useState(sellableVariants[0]?.id ?? orderableVariants[0]?.id ?? "");
  const [colorName, setColorName] = useState<string | null>(
    sellableVariants[0]?.color?.trim() ?? orderableVariants[0]?.color?.trim() ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [notifyContact, setNotifyContact] = useState("");
  const [notifyPending, setNotifyPending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyDone, setNotifyDone] = useState(false);

  const selected = orderableVariants.find((variant) => variant.id === variantId) ?? null;
  const selectedOutOfStock = selected !== null && !selected.sellable && selected.outOfStock;

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

  async function submitNotify() {
    if (!selected) {
      return;
    }

    const value = notifyContact.trim();
    const digits = value.replace(/[\s\-()]/g, "").replace(/^\+/, "");
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const looksLikePhone = /^[0-9]{8,15}$/.test(digits);

    if (!looksLikeEmail && !looksLikePhone) {
      setNotifyError(isArabic ? "اكتب إيميل صحيح أو رقم موبايل (٨ أرقام على الأقل)." : "Enter a valid email or phone number.");
      return;
    }

    setNotifyPending(true);
    setNotifyError(null);

    try {
      await apiRequest("/api/stock-alerts", {
        method: "POST",
        body: JSON.stringify({ variantId: selected.id, contact: value }),
      });
      setNotifyDone(true);
    } catch (requestError) {
      setNotifyError(apiErrorMessage(requestError, errors));
    } finally {
      setNotifyPending(false);
    }
  }

  if (!canPurchase) {
    return null;
  }

  if (orderableVariants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{labels.notAvailable}</p>
        <p className="mt-1 text-xs text-slate-500">{labels.notAvailableHint}</p>
      </div>
    );
  }

  // Scarcity threshold
  const isLowStock = selected && selected.availableQuantity > 0 && selected.availableQuantity <= 3;

  // One swatch per distinct colour, flagged when every size of it is gone.
  const colors = Array.from(
    orderableVariants.reduce((map, variant) => {
      const name = variant.color?.trim();
      if (name && !map.has(name)) {
        map.set(name, { name, hex: colorHex?.[name] ?? null, sellable: false });
      }
      const entry = name ? map.get(name) : undefined;
      if (entry && variant.sellable) {
        entry.sellable = true;
      }
      return map;
    }, new Map<string, { name: string; hex: string | null; sellable: boolean }>())
  ).map(([, value]) => value);

  const colorVariants =
    colorName === null
      ? orderableVariants.filter((variant) => !variant.color?.trim())
      : orderableVariants.filter((variant) => variant.color?.trim() === colorName);
  const sizeVariants = colorVariants.length > 0 ? colorVariants : orderableVariants;

  function selectColor(name: string) {
    setColorName(name);
    const candidates = orderableVariants.filter((variant) => variant.color?.trim() === name);
    const next = candidates.find((variant) => variant.sellable) ?? candidates[0];
    if (next) {
      setVariantId(next.id);
    }
    setError(null);
    setNotifyDone(false);
    setNotifyError(null);
  }

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

        {/* Colours and the sizes that belong to the chosen one */}
        <div className="mt-3 space-y-3">
          {colors.length > 1 ? (
            <div>
              <span className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                {isArabic ? "اللون:" : "Colour:"}
                <span className="font-bold text-slate-900 dark:text-slate-100">{colorName ?? "—"}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isPicked = color.name === colorName;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => selectColor(color.name)}
                      aria-pressed={isPicked}
                      aria-label={color.name}
                      title={color.name}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                        isPicked
                          ? "border-slate-950 p-0.5 dark:border-white"
                          : "border-slate-200 hover:border-slate-400 dark:border-slate-700"
                      } ${color.sellable ? "" : "opacity-40"}`}
                    >
                      <span
                        className="h-full w-full rounded-full border border-black/10"
                        style={{ backgroundColor: color.hex ?? "#cbd5e1" }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <span className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {isArabic ? "المقاس" : "Size"}
            </span>
            <div className="flex flex-wrap gap-2">
              {sizeVariants.map((variant) => {
                const isSelected = variant.id === variantId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setVariantId(variant.id);
                      setError(null);
                      setNotifyDone(false);
                      setNotifyError(null);
                    }}
                    aria-pressed={isSelected}
                    aria-label={variant.sku}
                    className={`relative flex h-11 min-w-12 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all ${
                      isSelected
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm dark:border-white dark:bg-white dark:text-slate-900"
                        : variant.sellable
                          ? "border-slate-200 bg-white text-slate-800 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          : "border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <span className={variant.sellable ? "" : "line-through decoration-rose-400/70"}>
                      {variant.size ?? variant.label}
                    </span>
                    {!variant.sellable ? (
                      <span className="absolute -top-1.5 -end-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {isArabic ? "نفد" : "Out"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {selected ? (
              <p className="mt-2 text-[11px] text-slate-500">
                {selected.sku} · {selected.unitPrice} {currency}
              </p>
            ) : null}
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

        {/* Out of stock: collect a contact instead of a dead add button */}
        {selectedOutOfStock ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {isArabic
                ? `مقاس ${selected.size ?? ""} نفد حاليًا`
                : `Size ${selected.size ?? ""} is out of stock`}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
              {isArabic
                ? "سجّل إيميلك أو رقمك وهنبلّغك أول ما يرجع."
                : "Leave your email or phone and we will tell you the moment it returns."}
            </p>
            {notifyDone ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckIcon className="h-4 w-4 shrink-0" />
                <span>{isArabic ? "اتسجّلت ✓ هنبلّغك أول ما يتوفر" : "Saved — we will let you know when it is back"}</span>
              </p>
            ) : (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={notifyContact}
                  onChange={(event) => {
                    setNotifyContact(event.target.value);
                    setNotifyError(null);
                  }}
                  placeholder={isArabic ? "الإيميل أو رقم الموبايل" : "Email or phone number"}
                  className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-amber-900/60 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={submitNotify}
                  disabled={notifyPending || notifyContact.trim() === ""}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {notifyPending ? "..." : isArabic ? "🔔 أعلمني عند التوفر" : "🔔 Notify me"}
                </button>
              </div>
            )}
            {notifyError ? (
              <p role="alert" className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {notifyError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Quantity and Add to Cart action */}
        {!selectedOutOfStock ? (
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
        ) : null}

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
      {selected && selected.sellable ? (
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
