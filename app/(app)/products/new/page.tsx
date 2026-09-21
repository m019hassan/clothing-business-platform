import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listCategories } from "@/modules/catalog/application/categories";
import { ProductForm } from "@/modules/catalog/components/product-form";

export default async function NewProductPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.PRODUCTS_CREATE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Creating products requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the products.create permission. Ask a manager to grant it.
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

  const categories = await listCategories({ includeInactive: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Catalog</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">New product</h2>
        <p className="mt-1 text-sm text-slate-600">
          Prices, status and variants are validated by the server before anything is stored.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProductForm mode="create" categories={categories} />
      </section>
    </div>
  );
}
