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

  if (notCustomer || loadError || cart === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">
          {notCustomer ? "Checkout is available for customer accounts" : "Unable to load your cart"}
        </h3>
        <p className="mt-1 text-sm text-rose-700">Please go back and try again.</p>
        <Link href="/cart" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          Back to cart
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
        <p className="text-base font-semibold text-slate-800">Nothing to check out</p>
        <p className="mt-1 text-sm text-slate-500">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/cart" className="font-medium text-slate-600 hover:text-blue-700">
          Cart
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-800">Checkout</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
            <p className="text-sm text-slate-500">
              {itemCount} item{itemCount === 1 ? "" : "s"} in your cart
            </p>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Item</th>
                  <th scope="col" className="px-6 py-3 text-right">Qty</th>
                  <th scope="col" className="px-6 py-3 text-right">Unit price</th>
                  <th scope="col" className="px-6 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {formatMoney(item.unitPrice, item.currency)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
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
          <h3 className="text-base font-semibold text-slate-900">Payment</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-medium text-slate-900">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatMoney(cart.total, cart.items[0]?.currency ?? "")}
              </dd>
            </div>
          </dl>

          <CheckoutButton addresses={addresses} />

          <p className="text-xs text-slate-500">
            The order starts in draft status and inventory stays reserved until the payment outcome is recorded.
          </p>
        </section>
      </div>
    </div>
  );
}
