import Link from "next/link";

import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { listProducts } from "@/modules/catalog/application/products";
import type { ProductView } from "@/modules/catalog/types";
import { formatMoney } from "@/src/lib/format";

const PAGE_SIZE = 10;

type ProductsPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

function parseOffset(raw: string | undefined): number {
  const value = Number(raw ?? "0");

  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseLimit(raw: string | undefined): number {
  const value = Number(raw ?? String(PAGE_SIZE));

  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : PAGE_SIZE;
}

function variantSummary(product: ProductView): string {
  if (product.variants.length === 0) {
    return "No active variants";
  }

  const skus = product.variants.slice(0, 2).map((variant) => variant.sku);
  const remaining = product.variants.length - skus.length;

  return remaining > 0 ? `${skus.join(", ")} +${remaining}` : skus.join(", ");
}

function totalAvailable(product: ProductView): number {
  return product.variants.reduce((sum, variant) => sum + variant.availableQuantity, 0);
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);

  let products: ProductView[] = [];
  let loadError = false;

  try {
    products = await listProducts({ limit, offset });
  } catch {
    loadError = true;
  }

  const rangeStart = products.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + products.length;
  const hasPrevious = offset > 0;
  const hasNext = products.length === limit;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Catalog</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Products</h2>
          <p className="mt-1 text-sm text-slate-600">
            Active catalog items with their sellable variants and live availability.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            disabled
            placeholder="Search (coming soon)"
            aria-label="Search products"
            className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 sm:w-56"
          />
          <button
            type="button"
            disabled
            title="Product creation is not available through the API yet"
            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
          >
            Add product
          </button>
        </div>
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">Unable to load products</h3>
          <p className="mt-1 text-sm text-rose-700">
            The catalog could not be retrieved right now. Please refresh the page to try again.
          </p>
        </section>
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No products on this page</p>
          <p className="mt-1 text-sm text-slate-500">
            {offset > 0
              ? "You have reached the end of the catalog. Use Previous to go back."
              : "Products will appear here once they are added to the catalog."}
          </p>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Product</th>
                  <th scope="col" className="px-6 py-3">Variants</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Base price</th>
                  <th scope="col" className="px-6 py-3">Available</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{product.categoryName ?? "Uncategorized"}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <span className="font-medium">{product.variants.length}</span>
                      <p className="text-xs text-slate-500">{variantSummary(product)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ProductStatusBadge status={product.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                      {formatMoney(product.basePrice, product.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{totalAvailable(product)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mobile cards */}
          <section className="space-y-3 lg:hidden">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{product.name}</p>
                    <p className="truncate text-xs text-slate-500">{product.categoryName ?? "Uncategorized"}</p>
                  </div>
                  <ProductStatusBadge status={product.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Base price</dt>
                    <dd className="text-slate-800">{formatMoney(product.basePrice, product.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Variants</dt>
                    <dd className="text-slate-800">{product.variants.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Available</dt>
                    <dd className="text-slate-800">{totalAvailable(product)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">SKUs</dt>
                    <dd className="truncate text-slate-800">{variantSummary(product)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/products?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Previous
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/products?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  Next
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
