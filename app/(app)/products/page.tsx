import Link from "next/link";

import { ImageViewer } from "@/components/products/image-viewer";
import { ProductPhotoGrid } from "@/components/products/product-photo-grid";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { StockBadge } from "@/components/products/stock-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { listCategories } from "@/modules/catalog/application/categories";
import {
  countProducts,
  listProducts,
  parseProductListFilters,
  type ProductListFilters,
} from "@/modules/catalog/application/products";
import type { ProductView } from "@/modules/catalog/types";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  XIcon,
} from "@/components/ui/icons";

const PAGE_SIZE = 12;

type ProductsPageProps = {
  searchParams: Promise<{
    offset?: string;
    limit?: string;
    q?: string;
    category?: string;
    sort?: string;
    status?: string;
    view?: string;
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

/** The distinct sizes of a product's active variants, smallest number first. */
function productSizes(product: ProductView): string[] {
  const sizes = new Set<string>();

  for (const variant of product.variants) {
    if (variant.size) {
      sizes.add(variant.size);
    }
  }

  return [...sizes].sort((left, right) => {
    const leftValue = /^\d+$/.test(left) ? Number(left) : Number.POSITIVE_INFINITY;
    const rightValue = /^\d+$/.test(right) ? Number(right) : Number.POSITIVE_INFINITY;

    return leftValue === rightValue ? left.localeCompare(right) : leftValue - rightValue;
  });
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
  const isTableView = params.view === "table";

  const query = new URLSearchParams();
  for (const key of ["q", "category", "sort", "status", "view"] as const) {
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

  // Build URLs with toggled view
  const makeViewUrl = (view: "grid" | "table") => {
    const nextQuery = new URLSearchParams(query);
    if (view === "table") {
      nextQuery.set("view", "table");
    } else {
      nextQuery.delete("view");
    }
    return `/products?${nextQuery.toString()}`;
  };

  const makePageUrl = (newOffset: number) => {
    const nextQuery = new URLSearchParams(query);
    nextQuery.set("offset", String(newOffset));
    nextQuery.set("limit", String(limit));
    return `/products?${nextQuery.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{t.catalog.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.catalog.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t.catalog.subtitle}
          </p>
        </div>

        {canCreate ? (
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow"
          >
            <PlusIcon className="h-4 w-4" />
            <span>{t.catalog.addProduct}</span>
          </Link>
        ) : null}
      </section>

      {/* Filter and Search Bar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Preserve view parameter across filter submit */}
          {isTableView ? <input type="hidden" name="view" value="table" /> : null}

          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.catalog.search}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params.q ?? ""}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.catalog.category}
            </label>
            <select
              id="category"
              name="category"
              defaultValue={params.category ?? ""}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
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
            <label htmlFor="sort" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.catalog.sort}
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={params.sort ?? "name"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
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
              <label htmlFor="status" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t.catalog.status}
              </label>
              <select
                id="status"
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 sm:col-span-2 lg:col-span-5">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {t.catalog.applyFilters}
              </button>
              {activeFilters.length > 0 ? (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  <span>{t.catalog.clear}</span>
                </Link>
              ) : null}
              {filterError ? (
                <p role="alert" className="text-xs text-rose-600">
                  {t.catalog.invalidFilters}
                </p>
              ) : null}
            </div>

            {/* Layout Switcher (Grid vs Table) */}
            <div className="ms-auto flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <Link
                href={makeViewUrl("grid")}
                scroll={false}
                title="Grid view"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  !isTableView
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <GridIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </Link>
              <Link
                href={makeViewUrl("table")}
                scroll={false}
                title="Table view"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isTableView
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </Link>
            </div>
          </div>
        </form>
      </section>

      {/* Product Content */}
      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-sm font-semibold text-rose-800">{t.catalog.loadErrorTitle}</h3>
          <p className="mt-1 text-sm text-rose-700">
            {t.catalog.loadErrorBody}
          </p>
        </section>
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ShoppingBagIcon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-base font-semibold text-slate-900">{t.catalog.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {offset > 0 ? t.catalog.emptyEnd : t.catalog.emptyStart}
          </p>
        </section>
      ) : isTableView ? (
        /* Desktop Table View */
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-start">{t.catalog.product}</th>
                <th scope="col" className="px-6 py-3.5 text-start">{t.catalog.variants}</th>
                <th scope="col" className="px-6 py-3.5 text-start">{t.common.status}</th>
                <th scope="col" className="px-6 py-3.5 text-start">{t.catalog.basePrice}</th>
                <th scope="col" className="px-6 py-3.5 text-start">{t.catalog.available}</th>
                <th scope="col" className="px-6 py-3.5 text-end">{t.catalog.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageId ? (
                        <ImageViewer
                          imageIds={product.imageIds}
                          alt={product.name}
                          viewLabel={t.productImages.view}
                          closeLabel={t.productImages.close}
                          previousLabel={t.common.previous}
                          nextLabel={t.common.next}
                        />
                      ) : (
                        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <ShoppingBagIcon className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-slate-500">{product.categoryName ?? t.catalog.uncategorized}</p>
                        {productSizes(product).length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {productSizes(product).map((size) => (
                              <span
                                key={size}
                                className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700"
                              >
                                {size}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {product.variants.length}
                  </td>
                  <td className="px-6 py-4">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                    {formatMoney(product.basePrice, product.currency)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StockBadge availableQuantity={totalAvailable(product)} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-end">
                    <Link
                      href={`/products/${product.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span>{t.common.view}</span>
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        /* Modern Apparel Product Cards Grid View */
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const sizes = productSizes(product);
            const availableUnits = totalAvailable(product);

            return (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                {/* Image / Thumbnail Container */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                  {product.imageIds.length > 1 ? (
                    <ProductPhotoGrid
                      imageIds={product.imageIds}
                      alt={product.name}
                      labels={{
                        view: t.productImages.view,
                        close: t.productImages.close,
                        previous: t.common.previous,
                        next: t.common.next,
                      }}
                      className="h-full w-full"
                    />
                  ) : product.imageId ? (
                    <div className="h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/products/images/${product.imageId}`}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300">
                      <ShoppingBagIcon className="h-12 w-12" />
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute start-3 top-3 flex flex-wrap gap-1.5">
                    {product.categoryName ? (
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
                        {product.categoryName}
                      </span>
                    ) : null}
                  </div>

                  <div className="absolute end-3 top-3">
                    <ProductStatusBadge status={product.status} />
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="line-clamp-1 font-bold text-slate-900 transition-colors hover:text-blue-600"
                    >
                      {product.name}
                    </Link>

                    {/* Available Sizes Chips */}
                    {sizes.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 me-1">
                          {t.catalog.sizesLabel}:
                        </span>
                        {sizes.slice(0, 5).map((size) => (
                          <span
                            key={size}
                            className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"
                          >
                            {size}
                          </span>
                        ))}
                        {sizes.length > 5 ? (
                          <span className="text-[10px] text-slate-400">+{sizes.length - 5}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Price & Stock Row */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">
                        {t.catalog.basePrice}
                      </p>
                      <p className="text-base font-bold text-slate-900">
                        {formatMoney(product.basePrice, product.currency)}
                      </p>
                    </div>

                    <StockBadge availableQuantity={availableUnits} />
                  </div>

                  {/* Bottom Action */}
                  <Link
                    href={`/products/${product.id}`}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <span>{t.common.view}</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Pagination Section */}
      {products.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <p className="text-xs text-slate-500">
            {t.common.showing} <span className="font-bold text-slate-900">{rangeStart}</span>–
            <span className="font-bold text-slate-900">{rangeEnd}</span>
            {total !== null ? (
              <span>
                {" "}{t.common.of} <span className="font-bold text-slate-900">{total}</span>
              </span>
            ) : null}
          </p>

          <div className="flex items-center gap-2">
            {hasPrevious ? (
              <Link
                href={makePageUrl(Math.max(offset - limit, 0))}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t.common.previous}</span>
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ChevronLeftIcon className="h-3.5 w-3.5 rtl:rotate-180" />
                <span>{t.common.previous}</span>
              </span>
            )}

            {hasNext ? (
              <Link
                href={makePageUrl(offset + limit)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>{t.common.next}</span>
                <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-xl border border-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span>{t.common.next}</span>
                <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-180" />
              </span>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
