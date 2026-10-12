import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listBarcodeProducts } from "@/modules/catalog/application/barcodes";
import { listPromotions } from "@/modules/catalog/application/promotions";
import { DiscountRowActions } from "@/modules/catalog/components/discount-row-actions";
import { DiscountsCreateForm } from "@/modules/catalog/components/discounts-create-form";
import { formatDateTime } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  UPCOMING: "bg-sky-100 text-sky-800",
  EXPIRED: "bg-slate-200 text-slate-600",
  STOPPED: "bg-rose-100 text-rose-700",
};

export default async function DiscountsPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const { t } = await getInterfaceLanguage();

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

  const [promotions, products] = await Promise.all([listPromotions(), listBarcodeProducts()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.nav.products}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.discounts.title}</h1>
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

      <section className="space-y-3">
        {promotions.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            {t.discounts.empty}
          </p>
        ) : (
          promotions.map((promotion) => (
            <div
              key={promotion.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{promotion.name}</p>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                    -{promotion.percent}%
                  </span>
                  <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[promotion.status]].join(" ")}>
                    {promotion.status === "ACTIVE"
                      ? t.discounts.statusActive
                      : promotion.status === "UPCOMING"
                        ? t.discounts.statusUpcoming
                        : promotion.status === "EXPIRED"
                          ? t.discounts.statusExpired
                          : t.discounts.statusStopped}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(promotion.startsAt)} — {formatDateTime(promotion.endsAt)}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {promotion.productCount} · {promotion.productNames.join("، ")}
                </p>
              </div>
              <DiscountRowActions
                promotionId={promotion.id}
                isActive={promotion.isActive}
                labels={{
                  stop: t.discounts.stop,
                  start: t.discounts.start,
                  delete: t.discounts.delete,
                  deleteConfirm: t.discounts.deleteConfirm,
                  deleting: t.discounts.deleting,
                }}
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
