import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getBarcodeLabelGroups, listBarcodeProducts } from "@/modules/catalog/application/barcodes";
import { BarcodeSelectAll } from "@/modules/catalog/components/barcode-select-all";
import { PrintButton } from "@/modules/catalog/components/barcode-print-button";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

type BulkBarcodesPageProps = {
  searchParams: Promise<{ q?: string; ids?: string | string[] }>;
};

export default async function BulkBarcodesPage({ searchParams }: BulkBarcodesPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.PRODUCTS_VIEW)) {
    redirect("/dashboard");
  }

  const { t } = await getInterfaceLanguage();
  const params = await searchParams;
  const ids = Array.isArray(params.ids) ? params.ids : params.ids ? [params.ids] : [];
  const q = params.q ?? "";

  if (ids.length > 0) {
    const groups = await getBarcodeLabelGroups(ids.slice(0, 100));

    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <Link href={`/products/barcodes?q=${encodeURIComponent(q)}`} className="text-sm text-blue-700 hover:underline">
              ← {t.barcodes.bulkBack}
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.barcodes.bulkTitle}</h1>
          </div>
          <PrintButton label={t.barcodes.print} />
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {groups.flatMap((group) =>
            group.labels.map((label) => {
              const details = [
                label.size ? `${t.barcodes.size} ${label.size}` : null,
                label.color,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={label.id}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center print:border-slate-300"
                >
                  <p className="w-full truncate text-xs font-semibold text-slate-900">{label.title}</p>
                  {details ? <p className="text-[11px] text-slate-500">{details}</p> : null}
                  <p className="text-sm font-bold text-slate-900">{label.price}</p>
                  {label.barcode ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={label.barcode} alt={label.sku} className="h-14 w-full object-contain" />
                  ) : (
                    <p className="py-3 text-[11px] text-slate-500">{label.sku}</p>
                  )}
                </li>
              );
            }),
          )}
        </ul>
      </div>
    );
  }

  const products = await listBarcodeProducts(q);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/products" className="text-sm text-blue-700 hover:underline">
          ← {t.nav.products}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.barcodes.bulkTitle}</h1>
        <p className="text-sm text-slate-600">{t.barcodes.bulkHint}</p>
      </div>

      <form method="GET" action="/products/barcodes" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t.barcodes.bulkSearch}
            aria-label={t.barcodes.bulkSearch}
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            {t.barcodes.bulkSearch}
          </button>
        </div>

        {products.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            {t.catalog.emptyStart}
          </p>
        ) : (
          <>
            <BarcodeSelectAll label={t.barcodes.bulkSelectAll} />

            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {products.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" name="ids" value={product.id} className="h-4 w-4 rounded border-slate-300" />
                    <span className="font-medium text-slate-900">{product.name}</span>
                  </label>
                  <span className="text-xs text-slate-500">
                    {product.variantCount} {t.catalog.variants}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              {t.barcodes.bulkShow}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
