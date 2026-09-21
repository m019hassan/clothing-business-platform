import Link from "next/link";

import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { listCategories } from "@/modules/catalog/application/categories";
import { CategoryManager } from "@/modules/catalog/components/category-manager";
import {
  countProducts,
  listProducts,
  parseProductListFilters,
  type ProductListFilters,
} from "@/modules/catalog/application/products";
import type { ProductView } from "@/modules/catalog/types";
import { formatMoney } from "@/src/lib/format";

const PAGE_SIZE = 10;

type ProductsPageProps = {
  searchParams: Promise<{
    offset?: string;
    limit?: string;
    q?: string;
    category?: string;
    sort?: string;
    status?: string;
  }>;
};

const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
  { value: "price", label: "Price (low to high)" },
  { value: "price_desc", label: "Price (high to low)" },
  { value: "newest", label: "Newest first" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "Sellable only" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

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
  const permissions = await getCurrentPermissions();
  const canManageCatalog = permissions.has(PERMISSIONS.PRODUCTS_VIEW);
  const canCreate = permissions.has(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = permissions.has(PERMISSIONS.PRODUCTS_UPDATE);

  const params = await searchParams;
  const offset = parseOffset(params.offset);
  const limit = parseLimit(params.limit);

  const query = new URLSearchParams();
  for (const key of ["q", "category", "sort", "status"] as const) {
    const value = params[key];

    if (typeof value === "string" && value.length > 0) {
      query.set(key, value);
    }
  }

  let filters: ProductListFilters = {};
  let filterError = false;

  try {
    filters = parseProductListFilters(query, { allowStatus: canManageCatalog });
  } catch {
    filters = {};
    filterError = true;
  }

  let products: ProductView[] = [];
  let total: number | null = null;
  let loadError = false;

  try {
    [products, total] = await Promise.all([
      listProducts({ limit, offset }, filters),
      countProducts(filters),
    ]);
  } catch {
    loadError = true;
  }

  const categories = canCreate || canUpdate ? await listCategories({ includeInactive: true }) : [];
  const activeFilters = ["q", "category", "sort", "status"].filter((key) =>
    query.has(key),
  );

  const rangeStart = products.length === 0 ? offset : offset + 1;
  const rangeEnd = offset + products.length;
  const hasPrevious = offset > 0;
  const hasNext = total !== null ? offset + products.length < total : products.length === limit;

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

        {canCreate ? (
          <Link
            href="/products/new"
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            Add product
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Name or slug"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={params.category ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">All categories</option>
              {categories
                .filter((category) => category.isActive)
                .map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Sort
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={params.sort ?? "name"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {canManageCatalog ? (
            <div>
              <label htmlFor="status" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Apply filters
            </button>
            {activeFilters.length > 0 ? (
              <Link
                href="/products"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                Clear
              </Link>
            ) : null}
            {filterError ? (
              <p role="alert" className="text-sm text-rose-700">
                One of the filters was invalid, so the full catalog is shown.
              </p>
            ) : null}
          </div>
        </form>
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
              {total !== null ? (
                <span>
                  {" "}of <span className="font-medium text-slate-900">{total}</span>
                </span>
              ) : null}
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

      {canCreate ? <CategoryManager categories={categories} /> : null}
    </div>
  );
}
