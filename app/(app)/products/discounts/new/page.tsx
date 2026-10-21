import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBarcodeProducts } from "@/modules/catalog/application/barcodes";
import { DiscountsCreateForm } from "@/modules/catalog/components/discounts-create-form";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewDiscountPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.DISCOUNTS_MANAGE)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.discounts.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{t.discounts.permissionHint}</p>
        <Link
          href="/products"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.nav.products}
        </Link>
      </section>
    );
  }

  const products = await listBarcodeProducts();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/products/discounts" className="text-sm text-blue-700 hover:underline">
          ← {t.discounts.title}
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">{t.discounts.create}</h1>
        <p className="text-sm text-slate-600">{t.discounts.subtitle}</p>
      </div>

      <DiscountsCreateForm
        products={products.map((product) => ({ id: product.id, name: product.name }))}
        labels={{
          create: t.discounts.create,
          name: t.discounts.name,
          namePlaceholder: t.discounts.namePlaceholder,
          percent: t.discounts.percent,
          startsAt: t.discounts.startsAt,
          endsAt: t.discounts.endsAt,
          products: t.discounts.products,
          searchProducts: t.discounts.searchProducts,
          selectAll: t.discounts.selectAll,
          save: t.discounts.save,
          saving: t.discounts.saving,
          created: t.discounts.created,
          failed: t.discounts.failed,
        }}
      />
    </div>
  );
}
