import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/cart/add-to-cart";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { StockBadge } from "@/components/products/stock-badge";
import { getProductInventory } from "@/modules/catalog/application/products";
import type { ProductInventoryView } from "@/modules/catalog/types";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate, formatMoney } from "@/src/lib/format";

type ProductDetailProps = {
  params: Promise<{ id: string }>;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { id } = await params;

  let product: ProductInventoryView | null = null;
  let loadError = false;

  try {
    product = await getProductInventory(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    loadError = true;
  }

  if (loadError || product === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load this product</h3>
        <p className="mt-1 text-sm text-rose-700">
          The product could not be retrieved right now. Please refresh the page to try again.
        </p>
        <Link href="/products" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          Back to products
        </Link>
      </section>
    );
  }

  const totalOnHand = product.variants.reduce((sum, variant) => sum + variant.quantityOnHand, 0);
  const totalReserved = product.variants.reduce((sum, variant) => sum + variant.quantityReserved, 0);
  const totalAvailable = totalOnHand - totalReserved;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/products" className="font-medium text-slate-600 hover:text-blue-700">
          Products
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-slate-800">{product.name}</span>
      </div>

      {/* Product information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Product</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{product.name}</h2>
            {product.description ? (
              <p className="mt-3 max-w-3xl text-sm text-slate-600">{product.description}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No description provided.</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <ProductStatusBadge status={product.status} />
            <p className="text-lg font-semibold text-slate-900">
              {formatMoney(product.basePrice, product.currency)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled
                title="Product editing is not available through the API yet"
                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400"
              >
                Edit product
              </button>
              <button
                type="button"
                disabled
                title="Variant creation is not available through the API yet"
                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400"
              >
                Add variant
              </button>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Category" value={product.categoryName ?? "Uncategorized"} />
          <InfoRow label="Slug" value={product.slug} />
          <InfoRow label="Created" value={formatDate(product.createdAt)} />
          <InfoRow label="Updated" value={formatDate(product.updatedAt)} />
        </dl>
      </section>

      {/* Add to cart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <AddToCart
          currency={product.currency}
          variants={product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            label: [variant.sku, variant.size, variant.color].filter(Boolean).join(" · "),
            unitPrice: formatMoney(variant.priceOverride ?? product.basePrice, product.currency).replace(
              ` ${product.currency}`,
              "",
            ),
            availableQuantity: variant.availableQuantity,
            sellable:
              product.status === "ACTIVE" &&
              variant.status === "ACTIVE" &&
              variant.availableQuantity > 0,
          }))}
        />
      </section>

      {/* Inventory summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">On hand</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalOnHand}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Reserved</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalReserved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Available</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalAvailable}</p>
          <p className="mt-1 text-xs text-slate-400">On hand minus reserved</p>
        </div>
      </section>

      {/* Variants */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Variants</h3>
            <p className="text-sm text-slate-500">
              {product.variants.length} variant{product.variants.length === 1 ? "" : "s"} in this product
            </p>
          </div>
        </div>

        {product.variants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">No variants yet</p>
            <p className="mt-1 text-sm text-slate-500">
              A product without an active variant cannot be sold.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">SKU</th>
                    <th scope="col" className="px-6 py-3">Size</th>
                    <th scope="col" className="px-6 py-3">Color</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Unit price</th>
                    <th scope="col" className="px-6 py-3 text-right">On hand</th>
                    <th scope="col" className="px-6 py-3 text-right">Reserved</th>
                    <th scope="col" className="px-6 py-3 text-right">Available</th>
                    <th scope="col" className="px-6 py-3">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.map((variant) => (
                    <tr key={variant.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">{variant.sku}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">{variant.size ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600">{variant.color ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <ProductStatusBadge status={variant.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {formatMoney(variant.priceOverride ?? product.basePrice, product.currency)}
                        {variant.priceOverride ? (
                          <span className="ml-2 text-xs text-slate-400">override</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">{variant.quantityOnHand}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">{variant.quantityReserved}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-slate-900">
                        {variant.availableQuantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StockBadge availableQuantity={variant.availableQuantity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {product.variants.map((variant) => (
                <div key={variant.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{variant.sku}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[variant.size, variant.color].filter(Boolean).join(" · ") || "No attributes"}
                      </p>
                    </div>
                    <StockBadge availableQuantity={variant.availableQuantity} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ProductStatusBadge status={variant.status} />
                    <span className="text-sm text-slate-700">
                      {formatMoney(variant.priceOverride ?? product.basePrice, product.currency)}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">On hand</dt>
                      <dd className="text-slate-800">{variant.quantityOnHand}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Reserved</dt>
                      <dd className="text-slate-800">{variant.quantityReserved}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Available</dt>
                      <dd className="font-medium text-slate-900">{variant.availableQuantity}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <p className="text-xs text-slate-500">
            Available = on hand − reserved. Inventory is read-only here; stock adjustments have no API yet.
            Low stock follows the documented threshold of fewer than 10 available units
            (docs/01-product/business-rules.md).
          </p>
        </div>
      </section>
    </div>
  );
}
