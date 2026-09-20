import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { getProduct } from "@/modules/catalog/application/products";
import type { ProductView } from "@/modules/catalog/types";
import { NotFoundError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";

type ProductDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { id } = await params;

  let product: ProductView | null = null;
  let loadError = false;

  try {
    product = await getProduct(id);
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
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
        <Link href="/products" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          Back to products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/products" className="font-medium text-slate-600 hover:text-blue-700">
          Products
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-slate-800">{product.name}</span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">{product.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {product.categoryName ?? "Uncategorized"} · {product.slug}
            </p>
            {product.description ? (
              <p className="mt-3 max-w-3xl text-sm text-slate-600">{product.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <ProductStatusBadge status={product.status} />
            <p className="text-lg font-semibold text-slate-900">
              {formatMoney(product.basePrice, product.currency)}
            </p>
            <button
              type="button"
              disabled
              title="Product editing is not available through the API yet"
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              Edit product
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Variants</h3>
            <p className="text-sm text-slate-500">
              {product.variants.length} sellable variant{product.variants.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {product.variants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">No active variants</p>
            <p className="mt-1 text-sm text-slate-500">
              A product without an active variant is not sellable.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">SKU</th>
                  <th scope="col" className="px-6 py-3">Size</th>
                  <th scope="col" className="px-6 py-3">Color</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Unit price</th>
                  <th scope="col" className="px-6 py-3">Available</th>
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
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{variant.availableQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <p className="text-xs text-slate-500">
            Availability is calculated server-side as on-hand minus reserved. Raw inventory counters are
            not exposed by the catalog API.
          </p>
        </div>
      </section>
    </div>
  );
}
