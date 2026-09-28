import Link from "next/link";
import { redirect } from "next/navigation";

import { CartItemControls } from "@/components/cart/cart-item-controls";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCart } from "@/modules/cart/application/cart-service";
import type { CartView } from "@/modules/cart/types";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney, formatVariantAttributes } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.cart.notCustomerTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.cart.notCustomerHint}
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.cart.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.cart.title}</h2>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-800">{t.cart.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.cart.emptyHint}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {t.cart.browseProducts}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.cart.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.cart.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {itemCount} {itemCount === 1 ? t.cart.itemSingular : t.cart.itemPlural} {t.cart.countHintTail}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {cart.items.map((item) => (
              <li key={item.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${item.productId}`}
                      className="font-semibold text-slate-900 transition-colors hover:text-blue-700"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.sku}
                      {[item.size, item.color].some(Boolean)
                        ? ` · ${formatVariantAttributes(item.size, item.color)}`
                        : ""}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                      {formatMoney(item.unitPrice, item.currency)} {t.cart.each}
                    </p>
                    {item.availableQuantity <= 0 ? (
                      <p className="mt-1 text-xs font-medium text-rose-700">
                        {t.cart.outOfStock}
                      </p>
                    ) : item.availableQuantity < item.quantity ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        {t.cart.onlyAvailable
                          .replace("{available}", String(item.availableQuantity))
                          .replace("{inCart}", String(item.quantity))}
                      </p>
                    ) : item.availableQuantity < 10 ? (
                      <p className="mt-1 text-xs text-amber-700">
                        {t.cart.onlyLeft.replace("{available}", String(item.availableQuantity))}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <p className="text-sm font-semibold text-slate-900">
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

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h3 className="text-base font-semibold text-slate-900">{t.cart.summary}</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">{t.common.items}</dt>
              <dd className="font-medium text-slate-900">{itemCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">{t.common.subtotal}</dt>
              <dd className="font-medium text-slate-900">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">{t.common.total}</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className="mt-5 block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {t.cart.proceedToCheckout}
          </Link>
          <Link
            href="/products"
            className="mt-3 block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t.cart.continueShopping}
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            {t.cart.totalNote}
          </p>
        </section>
      </div>
    </div>
  );
}
