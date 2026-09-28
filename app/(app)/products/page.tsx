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
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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
  const { t } = await getInterfaceLanguage();
  const sortOptions = [
    { value: "name", label: t.catalog.sortOptions.name },
    { value: "name_desc", label: t.catalog.sortOptions.nameDesc },
    { value: "price", label: t.catalog.sortOptions.price },
    { value: "price_desc", label: t.catalog.sortOptions.priceDesc },
    { value: "newest", label: t.catalog.sortOptions.newest },
  ] as const;
  const statusOptions = [
    { value: "", label: t.catalog.statusOptions.sellable },
    { value: "ACTIVE", label: t.catalog.statusOptions.active },
    { value: "DRAFT", label: t.catalog.statusOptions.draft },
    { value: "ARCHIVED", label: t.catalog.statusOptions.archived },
  ] as const;
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
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.catalog.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.catalog.title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t.catalog.subtitle}
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/products/new"
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            {t.catalog.addProduct}
          </Link>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {t.catalog.search}
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder={t.catalog.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {t.catalog.category}
            </label>
            <select
              id="category"
              name="category"
              defaultValue={params.category ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">{t.catalog.allCategories}</option>
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
              {t.catalog.sort}
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={params.sort ?? "name"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {canManageCatalog ? (
            <div>
              <label htmlFor="status" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                {t.catalog.status}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                {statusOptions.map((option) => (
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
              {t.catalog.applyFilters}
            </button>
            {activeFilters.length > 0 ? (
              <Link
                href="/products"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
              >
                {t.catalog.clear}
              </Link>
            ) : null}
            {filterError ? (
              <p role="alert" className="text-sm text-rose-700">
                {t.catalog.invalidFilters}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">{t.catalog.loadErrorTitle}</h3>
          <p className="mt-1 text-sm text-rose-700">
            {t.catalog.loadErrorBody}
          </p>
        </section>
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.catalog.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {offset > 0
              ? t.catalog.emptyEnd
              : t.catalog.emptyStart}
          </p>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.catalog.product}</th>
                  <th scope="col" className="px-6 py-3">{t.catalog.variants}</th>
                  <th scope="col" className="px-6 py-3">{t.common.status}</th>
                  <th scope="col" className="px-6 py-3">{t.catalog.basePrice}</th>
                  <th scope="col" className="px-6 py-3">{t.catalog.available}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.catalog.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{product.categoryName ?? t.catalog.uncategorized}</p>
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
                    <td className="whitespace-nowrap px-6 py-4 text-end">
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        {t.common.view}
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
                    <p className="truncate text-xs text-slate-500">{product.categoryName ?? t.catalog.uncategorized}</p>
                  </div>
                  <ProductStatusBadge status={product.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">{t.catalog.basePrice}</dt>
                    <dd className="text-slate-800">{formatMoney(product.basePrice, product.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.catalog.variants}</dt>
                    <dd className="text-slate-800">{product.variants.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.catalog.available}</dt>
                    <dd className="text-slate-800">{totalAvailable(product)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">{t.catalog.skus}</dt>
                    <dd className="truncate text-slate-800">{variantSummary(product)}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              {t.common.showing} <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span>
              {total !== null ? (
                <span>
                  {" "}{t.common.of} <span className="font-medium text-slate-900">{total}</span>
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/products?offset=${Math.max(offset - limit, 0)}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.previous}
                </span>
              )}
              {hasNext ? (
                <Link
                  href={`/products?offset=${offset + limit}&limit=${limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.next}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">
                  {t.common.next}
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
