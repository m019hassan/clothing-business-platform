import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddToCart } from "@/components/cart/add-to-cart";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductTabs } from "@/components/products/product-tabs";
import { RelatedProducts } from "@/components/products/related-products";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { StockBadge } from "@/components/products/stock-badge";
import { StockAdjustForm } from "@/modules/inventory/components/stock-adjust-form";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getProductTaxExemption } from "@/modules/catalog/application/taxes";
import { ProductTaxToggle } from "@/modules/catalog/components/product-tax-toggle";
import {
  getProductBranchStock,
  getProductInventory,
  listRelatedProducts,
  type RelatedProductView,
  type ProductBranchStockView,
} from "@/modules/catalog/application/products";
import type { ProductInventoryView } from "@/modules/catalog/types";
import { NotFoundError } from "@/src/lib/errors";
import { formatDate, formatMoney, variantLabel } from "@/src/lib/format";
import { ImageViewer } from "@/components/products/image-viewer";
import { listProductImages } from "@/modules/catalog/application/product-images";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

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
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissionSet = await getCurrentPermissions();
  const canUpdateProduct = permissionSet.has(PERMISSIONS.PRODUCTS_UPDATE);
  const canAdjustInventory = permissionSet.has(PERMISSIONS.INVENTORY_ADJUST);
  const canViewInventory = permissionSet.has(PERMISSIONS.INVENTORY_VIEW);
  const showStaff = canUpdateProduct || canAdjustInventory || canViewInventory;
  const canPurchase = account.accountType === "CUSTOMER" && account.customerProfile !== null;
  const { t, locale } = await getInterfaceLanguage();

  const { id } = await params;

  let product: ProductInventoryView | null = null;
  let branchStock: ProductBranchStockView | null = null;
  let taxExempt = false;
  let related: RelatedProductView[] = [];
  let loadError = false;

  try {
    product = await getProductInventory(id);
    branchStock = await getProductBranchStock(id);
    taxExempt = await getProductTaxExemption(id).catch(() => false);
    related = await listRelatedProducts(id).catch(() => []);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    loadError = true;
  }

  if (loadError || product === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.catalog.detail.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">
          {t.catalog.detail.loadErrorBody}
        </p>
        <Link href="/products" className="mt-4 inline-flex text-sm font-medium text-rose-800 underline">
          {t.nav.products}
        </Link>
      </section>
    );
  }

  const totalOnHand = product.variants.reduce((sum, variant) => sum + variant.quantityOnHand, 0);
  const totalReserved = product.variants.reduce((sum, variant) => sum + variant.quantityReserved, 0);
  const totalAvailable = totalOnHand - totalReserved;

  const productImages = await listProductImages(product.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/products" className="font-medium text-slate-600 hover:text-blue-700">
          {t.nav.products}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-slate-800">{product.name}</span>
      </div>

      {showStaff ? (
        <>
      {/* Product information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.catalog.product}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{product.name}</h2>
            {product.description ? (
              <p className="mt-3 max-w-3xl text-sm text-slate-600">{product.description}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">{t.catalog.detail.noDescription}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <ProductStatusBadge status={product.status} labels={t.catalog.statusLabels} />
            <p className="flex items-baseline gap-2 text-lg font-semibold text-slate-900">
              <span>{formatMoney(product.salePrice ?? product.basePrice, product.currency)}</span>
              {product.salePrice ? (
                <>
                  <span className="text-sm font-normal text-slate-400 line-through">
                    {formatMoney(product.basePrice, product.currency)}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                    -{product.discountPercent}%
                  </span>
                </>
              ) : null}
            </p>
            {canUpdateProduct ? (
              <div className="flex gap-2">
                <Link
                  href={`/products/${product.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t.catalog.detail.editProduct}
                </Link>
                <Link
                  href={`/products/${product.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {t.catalog.detail.manageVariants}
                </Link>
                <Link
                  href={`/products/${product.id}/barcodes`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {t.barcodes.link}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label={t.catalog.form.material} value={product.material ?? "—"} />
          <InfoRow label={t.catalog.detail.slug} value={product.slug} />
          <InfoRow label={t.catalog.detail.created} value={formatDate(product.createdAt)} />
          <InfoRow label={t.catalog.detail.updated} value={formatDate(product.updatedAt)} />
        </dl>

        {canUpdateProduct ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t.tax.productLabel}</p>
              <p className="text-xs text-slate-500">{taxExempt ? t.tax.exemptionNote : t.tax.taxableNote}</p>
            </div>
            <ProductTaxToggle
              productId={product.id}
              initialExempt={taxExempt}
              labels={{ exempt: t.tax.markExempt, taxable: t.tax.markTaxable, saving: t.tax.savingShort }}
              errors={t.errors}
            />
          </div>
        ) : null}
      </section>
        </>
      ) : null}

      {/* Storefront hero */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <ProductGallery
          imageIds={product.imageIds}
          alt={product.name}
          labels={{
            view: t.productImages.view,
            close: t.productImages.close,
            previous: t.common.previous,
            next: t.common.next,
          }}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {new Date(product.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {locale === "ar" ? "جديد" : "New"}
              </span>
            ) : null}
            {product.discountPercent ? (
              <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                {locale === "ar" ? `خصم ${product.discountPercent}%` : `${product.discountPercent}% OFF`}
              </span>
            ) : null}
            <ProductStatusBadge status={product.status} />
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{product.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{product.categoryName ?? "—"}</p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            {product.salePrice ? (
              <>
                <span className="text-2xl font-bold text-slate-950">
                  {formatMoney(product.salePrice, product.currency)}
                </span>
                <span className="text-lg text-slate-400 line-through">
                  {formatMoney(product.basePrice, product.currency)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-950">
                {formatMoney(product.basePrice, product.currency)}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {product.description ?? (locale === "ar" ? "قطعة من مجموعة المتجر." : "A piece from the store collection.")}
          </p>

          <div className="mt-5">
      {/* Add to cart — customer accounts only */}
      {canPurchase ? (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <AddToCart
          labels={t.catalog.addToCart}
          errors={t.errors}
          currency={product.currency}
          isArabic={locale === "ar"}
          canPurchase={canPurchase}
          variants={product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            label: variantLabel(variant.sku, variant.size, variant.color),
            unitPrice: formatMoney(variant.priceOverride ?? product.basePrice, product.currency).replace(
              ` ${product.currency}`,
              "",
            ),
            availableQuantity: variant.availableQuantity,
            sellable:
              product.status === "ACTIVE" &&
              variant.status === "ACTIVE" &&
              variant.availableQuantity > 0,
            outOfStock:
              product.status === "ACTIVE" &&
              variant.status === "ACTIVE" &&
              variant.availableQuantity <= 0,
          }))}
        />
      </section>
      ) : null}
          </div>
        </div>
      </section>

      <ProductTabs
        description={product.description}
        material={product.material}
        imageId={product.imageIds[1] ?? product.imageIds[0] ?? null}
        isArabic={locale === "ar"}
      />

      {canPurchase ? (
        <RelatedProducts
          products={related}
          labels={{
            title: locale === "ar" ? "ممكن يعجبك كمان" : "You may also like",
            viewAll: locale === "ar" ? "عرض الكل" : "View all",
            off: locale === "ar" ? "خصم" : "OFF",
          }}
        />
      ) : null}


      {showStaff ? (
        <>
      {productImages.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">{t.productImages.gallery}</h3>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {productImages.map((image, position) => (
              <li key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex h-40 items-center justify-center bg-slate-50">
                  <ImageViewer
                    size="large"
                    imageIds={productImages.map((entry) => entry.id)}
                    startIndex={position}
                    alt={image.originalName}
                    viewLabel={t.productImages.view}
                    closeLabel={t.productImages.close}
                    previousLabel={t.common.previous}
                    nextLabel={t.common.next}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* Inventory summary */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.catalog.detail.onHand}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalOnHand}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.catalog.detail.reserved}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalReserved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.catalog.detail.available}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalAvailable}</p>
          <p className="mt-1 text-xs text-slate-400">{t.catalog.detail.onHandMinusReserved}</p>
        </div>
      </section>

      {branchStock ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">{t.catalog.detail.branchStockTitle}</h3>
          <p className="mt-1 text-sm text-slate-600">{t.catalog.detail.branchStockHint}</p>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              {t.catalog.detail.storageLabel}:{" "}
              <span className="text-lg font-bold text-slate-900">{branchStock.storage.totalAvailable}</span>
            </p>
            {branchStock.storage.warehouses.length > 0 ? (
              <p className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                {branchStock.storage.warehouses.map((warehouse) => (
                  <span key={warehouse.id} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    {warehouse.name} ({warehouse.code}): {warehouse.available}
                  </span>
                ))}
              </p>
            ) : null}
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {branchStock.branches.map((branch) => (
              <li
                key={branch.branchId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{branch.branchName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{branch.branchCode}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={[
                      "text-lg font-bold",
                      branch.available > 0 ? "text-slate-900" : "text-rose-600",
                    ].join(" ")}
                  >
                    {branch.available}
                  </span>
                  {branch.storeId ? (
                    <Link
                      href={"/inventory/warehouses/" + branch.storeId}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {t.catalog.detail.storeLabel}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Variants */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t.catalog.detail.variants}</h3>
            <p className="text-sm text-slate-500">
              {product.variants.length}{" "}
              {product.variants.length === 1 ? t.catalog.detail.variantSingular : t.catalog.detail.variantPlural}
            </p>
          </div>
        </div>

        {product.variants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">{t.catalog.detail.noVariants}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t.catalog.detail.noVariantsHint}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">{t.catalog.detail.size}</th>
                    <th scope="col" className="px-6 py-3">{t.catalog.detail.color}</th>
                    <th scope="col" className="px-6 py-3">{t.catalog.detail.sku}</th>
                    <th scope="col" className="px-6 py-3">{t.common.status}</th>
                    <th scope="col" className="px-6 py-3">{t.catalog.detail.unitPrice}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.catalog.detail.onHand}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.catalog.detail.reserved}</th>
                    <th scope="col" className="px-6 py-3 text-end">{t.catalog.detail.available}</th>
                    <th scope="col" className="px-6 py-3">{t.catalog.detail.stock}</th>
                    {canAdjustInventory ? <th scope="col" className="px-6 py-3">{t.inventory.adjust}</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.map((variant) => (
                    <tr key={variant.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-lg font-bold text-slate-900">
                        {variant.size ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-700">{variant.color ?? "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-400">{variant.sku}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <ProductStatusBadge status={variant.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {formatMoney(variant.priceOverride ?? product.basePrice, product.currency)}
                        {variant.priceOverride ? (
                          <span className="ms-2 text-xs text-slate-400">{t.catalog.detail.override}</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">{variant.quantityOnHand}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">{variant.quantityReserved}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-end font-medium text-slate-900">
                        {variant.availableQuantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StockBadge availableQuantity={variant.availableQuantity} labels={t.catalog.stockLabels} />
                      </td>
                      {canAdjustInventory ? (
                        <td className="whitespace-nowrap px-6 py-4">
                          <StockAdjustForm
                            variantId={variant.id}
                            sku={variant.sku}
                            labels={{ ...t.inventory, saving: t.catalog.form.saving }}
                          />
                        </td>
                      ) : null}
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
                      <p className="truncate text-lg font-bold text-slate-900">
                        {[variant.size, variant.color].filter(Boolean).join(" · ") || variant.sku}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-400">{variant.sku}</p>
                    </div>
                    <StockBadge availableQuantity={variant.availableQuantity} labels={t.catalog.stockLabels} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ProductStatusBadge status={variant.status} />
                    <span className="text-sm text-slate-700">
                      {formatMoney(variant.priceOverride ?? product.basePrice, product.currency)}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">{t.catalog.detail.onHand}</dt>
                      <dd className="text-slate-800">{variant.quantityOnHand}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t.catalog.detail.reserved}</dt>
                      <dd className="text-slate-800">{variant.quantityReserved}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">{t.catalog.detail.available}</dt>
                      <dd className="font-medium text-slate-900">{variant.availableQuantity}</dd>
                    </div>
                  </dl>
                  {canAdjustInventory ? (
                    <div className="mt-4">
                      <StockAdjustForm
                        variantId={variant.id}
                        sku={variant.sku}
                        labels={{ ...t.inventory, saving: t.catalog.form.saving }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <p className="text-xs text-slate-500">
            {t.catalog.detail.footnote}
          </p>
        </div>
      </section>
        </>
      ) : null}
    </div>
  );
}
