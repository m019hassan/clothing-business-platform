import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCategories } from "@/modules/catalog/application/categories";
import { getProductInventory } from "@/modules/catalog/application/products";
import { CategoryManager } from "@/modules/catalog/components/category-manager";
import { ProductForm } from "@/modules/catalog/components/product-form";
import { VariantManager } from "@/modules/catalog/components/variant-manager";
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

  if (!permissions.has(PERMISSIONS.PRODUCTS_UPDATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Editing products requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the products.update permission. Ask a manager to grant it.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to products
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Catalog</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {product.slug} · {product.categoryName ?? "No category"} · {product.status}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/products/${product.id}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            View product
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            All products
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Product details</h3>
        <div className="mt-5">
          <ProductForm
            mode="edit"
            categories={categories}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              basePrice: product.basePrice,
              status: product.status,
              categoryId: product.categoryId,
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Variants</h3>
        <p className="mt-1 text-sm text-slate-500">
          Every variant (including draft and archived ones) with its live availability.
        </p>
        <div className="mt-5">
          <VariantManager
            productId={product.id}
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

      <CategoryManager categories={categories} />
    </div>
  );
}
