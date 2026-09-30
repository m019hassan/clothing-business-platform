import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCategories } from "@/modules/catalog/application/categories";
import { listColorOptions } from "@/modules/catalog/application/colors";
import { listSizeOptions } from "@/modules/catalog/application/sizes";
import { listMaterialOptions } from "@/modules/catalog/application/materials";
import { getProductInventory } from "@/modules/catalog/application/products";
import { ProductForm } from "@/modules/catalog/components/product-form";
import { VariantManager } from "@/modules/catalog/components/variant-manager";
import { suggestSku } from "@/modules/catalog/application/identifiers";
import { listProductImages } from "@/modules/catalog/application/product-images";
import { ProductImagesManager } from "@/modules/catalog/components/product-images-manager";
import { ProductDeleteButton } from "@/modules/catalog/components/product-delete-button";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import type { ProductInventoryView } from "@/modules/catalog/types";
import { NotFoundError } from "@/src/lib/errors";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const { t } = await getInterfaceLanguage();

  if (!permissions.has(PERMISSIONS.PRODUCTS_UPDATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.catalog.editPage.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.catalog.editPage.permissionHint}
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.products}
        </Link>
      </section>
    );
  }

  const { id } = await params;

  let product: ProductInventoryView | null = null;

  try {
    product = await getProductInventory(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const categories = await listCategories({ includeInactive: true });
  const colors = await listColorOptions();
  const sizes = await listSizeOptions();
  const materials = await listMaterialOptions();
  const productImages = await listProductImages(product.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.catalog.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {product.slug} · {product.status}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/products/${product.id}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t.catalog.editPage.viewProduct}
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t.catalog.editPage.allProducts}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">{t.catalog.editPage.productDetails}</h3>
        <div className="mt-5">
          <ProductForm
            mode="edit"
            categories={categories}
            colors={colors}
          sizes={sizes}
          materials={materials}
            labels={{ ...t.catalog.form, status: t.common.status, category: t.catalog.category }}
            statusLabels={t.catalog.statusLabels}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              material: product.material,
              basePrice: product.basePrice,
              status: product.status,
              categoryId: product.categoryId,
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">{t.catalog.detail.variants}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t.catalog.editPage.variantsSubtitle}
        </p>
        <div className="mt-5">
          <VariantManager
            productId={product.id}
            colors={colors.map((color) => color.name)}
            sizes={sizes.map((size) => ({ label: size.label, ageLabel: size.ageLabel }))}
            suggestedSku={suggestSku(product.slug)}
            labels={{
              saving: t.catalog.form.saving,
              save: t.catalog.form.save,
              archive: t.catalog.form.archive,
              archiving: t.catalog.form.archiving,
              available: t.catalog.variantsAdmin.available,
              sizePlaceholder: t.catalog.detail.size,
              colorPlaceholder: t.catalog.detail.color,
              pricePlaceholder: t.catalog.form.priceOverride,
              ariaSize: t.catalog.variantsAdmin.ariaSize,
              ariaColor: t.catalog.variantsAdmin.ariaColor,
              ariaPrice: t.catalog.variantsAdmin.ariaPrice,
              ariaStatus: t.catalog.variantsAdmin.ariaStatus,
            }}
            newLabels={{
              addTitle: t.catalog.variantsAdmin.addTitle,
              add: t.catalog.variantsAdmin.add,
              adding: t.catalog.variantsAdmin.adding,
              empty: t.catalog.variantsAdmin.empty,
              newSku: t.catalog.variantsAdmin.newSku,
              newSize: t.catalog.variantsAdmin.newSize,
              newColor: t.catalog.variantsAdmin.newColor,
              newPrice: t.catalog.variantsAdmin.newPrice,
              newStatus: t.catalog.variantsAdmin.newStatus,
              skuPlaceholder: t.catalog.detail.sku,
              skuHint: t.catalog.variantsAdmin.skuHint,
              sizePlaceholder: t.catalog.detail.size,
              colorPlaceholder: t.catalog.detail.color,
              pricePlaceholder: t.catalog.form.priceOverride,
              quantityPlaceholder: t.catalog.variantsAdmin.quantityPlaceholder,
              newQuantity: t.catalog.variantsAdmin.newQuantity,
            }}
            statusLabels={t.catalog.statusLabels}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              priceOverride: variant.priceOverride,
              status: variant.status,
              availableQuantity: variant.availableQuantity,
            }))}
          />
        </div>
      </section>


        <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-rose-800">{t.catalog.editPage.deleteZone}</h3>
        <p className="mt-1 text-sm text-slate-600">{t.catalog.editPage.deleteHint}</p>
        <div className="mt-4">
          <ProductDeleteButton
            productId={product.id}
            productName={product.name}
            labels={{
              deleteProduct: t.catalog.editPage.deleteProduct,
              deleteConfirm: t.catalog.editPage.deleteConfirm,
              deleting: t.catalog.editPage.deleting,
            }}
          />
        </div>
      </section>

      <ProductImagesManager
          productId={product.id}
          images={productImages}
          variants={product.variants.map((variant) => ({
            id: variant.id,
            label: [variant.size, variant.color].filter(Boolean).join(" / ") || variant.sku,
          }))}
          labels={{ ...t.productImages, errors: t.errors }}
        />
    </div>
  );
}
