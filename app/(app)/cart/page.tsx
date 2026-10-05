import Link from "next/link";
import { redirect } from "next/navigation";

import { CartItemControls } from "@/components/cart/cart-item-controls";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCart } from "@/modules/cart/application/cart-service";
import type { CartView } from "@/modules/cart/types";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney, formatVariantAttributes } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from "@/components/ui/icons";

export default async function CartPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  let cart: CartView | null = null;
  let notCustomer = false;
  let loadError = false;

  try {
    cart = await getCart(account);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      notCustomer = true;
    } else {
      loadError = true;
    }
  }

  const { t } = await getInterfaceLanguage();

  if (notCustomer) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <ShoppingCartIcon className="h-6 w-6" />
        </div>
        <p className="mt-3 text-base font-bold text-slate-900">{t.cart.notCustomerTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.cart.notCustomerHint}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  if (loadError || cart === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.cart.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
      </section>
    );
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t.cart.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.cart.title}</h2>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <ShoppingCartIcon className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">{t.cart.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {t.cart.emptyHint}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow"
          >
            <ShoppingBagIcon className="h-4 w-4" />
            <span>{t.cart.browseProducts}</span>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t.cart.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.cart.title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {itemCount} {itemCount === 1 ? t.cart.itemSingular : t.cart.itemPlural} {t.cart.countHintTail}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        {/* Cart items list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <li key={item.id} className="p-5 transition-colors hover:bg-slate-50/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <ShoppingBagIcon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.productId}`}
                        className="font-bold text-slate-900 transition-colors hover:text-blue-600"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.sku}
                        {[item.size, item.color].some(Boolean)
                          ? ` · ${formatVariantAttributes(item.size, item.color)}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {formatMoney(item.unitPrice, item.currency)} <span className="text-xs font-normal text-slate-400">{t.cart.each}</span>
                      </p>
                      {item.availableQuantity <= 0 ? (
                        <p className="mt-1 text-xs font-semibold text-rose-600">
                          {t.cart.outOfStock}
                        </p>
                      ) : item.availableQuantity < item.quantity ? (
                        <p className="mt-1 text-xs font-semibold text-amber-600">
                          {t.cart.onlyAvailable
                            .replace("{available}", String(item.availableQuantity))
                            .replace("{inCart}", String(item.quantity))}
                        </p>
                      ) : item.availableQuantity < 10 ? (
                        <p className="mt-1 text-xs font-medium text-amber-600">
                          {t.cart.onlyLeft.replace("{available}", String(item.availableQuantity))}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <p className="text-base font-bold text-slate-900">
                      {formatMoney(item.lineTotal, item.currency)}
                    </p>
                    <CartItemControls
                      itemId={item.id}
                      quantity={item.quantity}
                      labels={t.cart.controls}
                      errors={t.errors}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order Summary sidebar */}
        <section className="h-fit rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:sticky lg:top-24 space-y-5">
          <h3 className="text-base font-bold text-slate-900">{t.cart.summary}</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <dt>{t.common.items}</dt>
              <dd className="font-semibold text-slate-900">{itemCount}</dd>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <dt>{t.common.subtotal}</dt>
              <dd className="font-semibold text-slate-900">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <dt className="text-base font-bold text-slate-900">{t.common.total}</dt>
              <dd className="text-xl font-bold text-slate-950">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
          </dl>

          <div className="space-y-2.5 pt-2">
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow"
            >
              <span>{t.cart.proceedToCheckout}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/products"
              className="block w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t.cart.continueShopping}
            </Link>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
            <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{t.cart.totalNote}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
