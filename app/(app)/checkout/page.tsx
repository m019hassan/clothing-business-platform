import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutButton } from "@/components/cart/checkout-button";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCart } from "@/modules/cart/application/cart-service";
import type { CartView } from "@/modules/cart/types";
import { listAddresses } from "@/modules/customers/application/addresses";
import type { AddressView } from "@/modules/customers/application/addresses";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export default async function CheckoutPage() {
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

  if (notCustomer || loadError || cart === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">
          {notCustomer ? t.checkout.notCustomer : t.cart.loadErrorTitle}
        </h3>
        <p className="mt-1 text-sm text-rose-700">{t.checkout.retryHint}</p>
        <Link href="/cart" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          {t.checkout.backToCart}
        </Link>
      </section>
    );
  }

  let addresses: AddressView[] = [];

  try {
    addresses = await listAddresses(account);
  } catch {
    addresses = [];
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-800">{t.checkout.nothing}</p>
        <p className="mt-1 text-sm text-slate-500">{t.checkout.cartEmptyHint}</p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          {t.cart.browseProducts}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/cart" className="font-medium text-slate-600 hover:text-blue-700">
          {t.cart.title}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-800">{t.checkout.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">{t.checkout.orderSummary}</h2>
            <p className="text-sm text-slate-500">
              {itemCount} {itemCount === 1 ? t.cart.itemSingular : t.cart.itemPlural} {t.checkout.inCart}
            </p>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.checkout.item}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.common.qty}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.common.unitPrice}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.common.lineTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-end text-slate-700">{item.quantity}</td>
                    <td className="px-6 py-4 text-end text-slate-700">
                      {formatMoney(item.unitPrice, item.currency)}
                    </td>
                    <td className="px-6 py-4 text-end font-medium text-slate-900">
                      {formatMoney(item.lineTotal, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 sm:hidden">
            {cart.items.map((item) => (
              <li key={item.id} className="p-5">
                <p className="font-medium text-slate-900">{item.productName}</p>
                <p className="text-xs text-slate-500">{item.sku}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>
                    {item.quantity} × {formatMoney(item.unitPrice, item.currency)}
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatMoney(item.lineTotal, item.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <h3 className="text-base font-semibold text-slate-900">{t.common.payment}</h3>
          <dl className="space-y-3 text-sm">
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

          <CheckoutButton addresses={addresses} labels={{ ...t.checkout, continueShopping: t.cart.continueShopping }} />

          <p className="text-xs text-slate-500">
            {t.checkout.draftNote}
          </p>
        </section>
      </div>
    </div>
  );
}
