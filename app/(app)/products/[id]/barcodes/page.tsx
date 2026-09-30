import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { renderBarcodeDataUri } from "@/modules/catalog/application/barcodes";
import { getProductInventory } from "@/modules/catalog/application/products";
import { PrintButton } from "@/modules/catalog/components/barcode-print-button";
import { AuthorizationError, NotFoundError } from "@/src/lib/errors";
import { formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProductBarcodesPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await getCurrentAccount();
  const { id } = await params;

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.PRODUCTS_VIEW)) {
    redirect("/dashboard");
  }

  const { t } = await getInterfaceLanguage();

  let product;

  try {
    product = await getProductInventory(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    if (error instanceof AuthorizationError) {
      redirect("/dashboard");
    }

    throw error;
  }

  const labels = product.variants.map((variant) => ({
    id: variant.id,
    title: product.name,
    details: [variant.size ? `${t.barcodes.size} ${variant.size}` : null, variant.color]
      .filter(Boolean)
      .join(" · "),
    price: formatMoney(variant.priceOverride ?? product.basePrice, product.currency),
    sku: variant.sku,
    barcode: renderBarcodeDataUri(variant.sku),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href={`/products/${product.id}`} className="text-sm text-blue-700 hover:underline">
            ← {product.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.barcodes.title}</h1>
          <p className="text-sm text-slate-600">{t.barcodes.hint}</p>
        </div>
        <PrintButton label={t.barcodes.print} />
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {labels.map((label) => (
          <li
            key={label.id}
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center print:border-slate-300"
          >
            <p className="w-full truncate text-xs font-semibold text-slate-900">{label.title}</p>
            {label.details ? <p className="text-[11px] text-slate-500">{label.details}</p> : null}
            <p className="text-sm font-bold text-slate-900">{label.price}</p>
            {label.barcode ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={label.barcode} alt={label.sku} className="h-14 w-full object-contain" />
            ) : (
              <p className="py-3 text-[11px] text-slate-500">{label.sku}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
