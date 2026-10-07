import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutFlow } from "@/components/cart/checkout-flow";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getCart } from "@/modules/cart/application/cart-service";
import type { CartView } from "@/modules/cart/types";
import { listAddresses } from "@/modules/customers/application/addresses";
import type { AddressView } from "@/modules/customers/application/addresses";
import { AuthorizationError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import {
  ChevronRightIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from "@/components/ui/icons";

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
        <Link href="/cart" className="mt-4 inline-flex text-sm font-semibold text-rose-800 underline">
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
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
          <ShoppingCartIcon className="h-7 w-7" />
        </div>
        <p className="mt-4 text-lg font-bold text-slate-900">{t.checkout.nothing}</p>
        <p className="mt-1 text-sm text-slate-500">{t.checkout.cartEmptyHint}</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow"
        >
          <ShoppingBagIcon className="h-4 w-4" />
          <span>{t.cart.browseProducts}</span>
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/cart" className="hover:text-slate-900 transition-colors">
          {t.cart.title}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-180 text-slate-400" />
        <span className="font-semibold text-slate-900">{t.checkout.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        {/* Order Items Review */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">{t.checkout.orderSummary}</h2>
            <p className="text-xs text-slate-500">
              {itemCount} {itemCount === 1 ? t.cart.itemSingular : t.cart.itemPlural} {t.checkout.inCart}
            </p>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-start">{t.checkout.item}</th>
                  <th scope="col" className="px-6 py-3.5 text-end">{t.common.qty}</th>
                  <th scope="col" className="px-6 py-3.5 text-end">{t.common.unitPrice}</th>
                  <th scope="col" className="px-6 py-3.5 text-end">{t.common.lineTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-end font-semibold text-slate-700">{item.quantity}</td>
                    <td className="px-6 py-4 text-end text-slate-600">
                      {formatMoney(item.unitPrice, item.currency)}
                    </td>
                    <td className="px-6 py-4 text-end font-bold text-slate-900">
                      {formatMoney(item.lineTotal, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile item list */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {cart.items.map((item) => (
              <li key={item.id} className="p-4">
                <p className="font-bold text-slate-900">{item.productName}</p>
                <p className="text-xs text-slate-500">{item.sku}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {item.quantity} × {formatMoney(item.unitPrice, item.currency)}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(item.lineTotal, item.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* One-page checkout: progress, address with map autocomplete, payment, review */}
        <CheckoutFlow
          addresses={addresses}
          total={String(cart.total)}
          currency={cart.items[0]?.currency ?? ""}
          labels={{ ...t.checkout, continueShopping: t.cart.continueShopping }}
          flow={t.checkoutFlow}
          errors={t.errors}
        />
      </div>
    </div>
  );
}
