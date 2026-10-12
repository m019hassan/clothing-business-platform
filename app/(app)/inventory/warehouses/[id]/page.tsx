import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StockBadge } from "@/components/products/stock-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { getWarehouseDetails } from "@/modules/inventory/application/inventory";
import { listTransferTargets } from "@/modules/inventory/application/transfers";
import { StockAdjustForm } from "@/modules/inventory/components/stock-adjust-form";
import { StockTransferForm } from "@/modules/inventory/components/stock-transfer-form";
import { StockTransferLauncher } from "@/modules/inventory/components/stock-transfer-launcher";
import { NotFoundError } from "@/src/lib/errors";
import { formatVariantAttributes } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

type WarehouseDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WarehouseDetailsPage({ params }: WarehouseDetailsPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.INVENTORY_VIEW)) {
    redirect("/dashboard");
  }

  const canAdjustInventory = permissions.has(PERMISSIONS.INVENTORY_ADJUST);
  const { t } = await getInterfaceLanguage();
  const { id } = await params;

  let details;

  try {
    const scope = await resolveBranchScope(account);
    details = await getWarehouseDetails(id, scope);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const transferTargets = canAdjustInventory ? await listTransferTargets() : [];
  const { warehouse, rows, summary } = details;
  const balances = rows
    .filter((row) => row.availableQuantity > 0)
    .map((row) => ({
      variantId: row.variantId,
      productName: row.productName,
      size: row.size,
      color: row.color,
      sku: row.sku,
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName,
      warehouseCode: row.warehouseCode,
      branchId: row.branchId,
      availableQuantity: row.availableQuantity,
    }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/inventory/warehouses" className="text-sm text-blue-700 hover:underline">
          ← {t.warehouses.title}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {warehouse.name} <span className="font-mono text-base text-slate-400">({warehouse.code})</span>
            </h1>
            <p className="text-sm text-slate-600">{warehouse.branchName ?? t.warehouses.central}</p>
          </div>
          {canAdjustInventory ? (
            <StockTransferLauncher
              balances={balances}
              targets={transferTargets}
              labels={{
                open: t.inventory.transferLauncher,
                title: t.inventory.transferTitle,
                hint: t.inventory.transferLauncherHint,
                pickTitle: t.inventory.transferPickTitle,
                detailsTitle: t.inventory.transferDetailsTitle,
                search: t.inventory.transferSearchPlaceholder,
                none: t.inventory.transferNoRows,
                back: t.inventory.transferBack,
                toBranch: t.inventory.toBranch,
                quantity: t.inventory.transferQuantity,
                all: t.inventory.all,
                availableHere: t.inventory.availableHere,
                from: t.inventory.warehouse,
                confirm: t.inventory.confirmTransfer,
                cancel: t.inventory.cancel,
                noTargets: t.inventory.noTransferTargets,
                done: t.inventory.transferDone,
                autoWarehouse: t.inventory.autoWarehouse,
              }}
            />
          ) : null}
        </div>
        <p className="text-sm text-slate-600">
          {t.warehouses.contentsHint}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.trackedBalances}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.variants}</p>
          <p className="mt-1 text-xs text-slate-400">{summary.products} منتج</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.onHand}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.onHand}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.available}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.available}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">{t.warehouses.emptyContents}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 text-start font-medium">{t.inventory.variant}</th>
                <th className="px-6 py-3 text-end font-medium">{t.inventory.onHand}</th>
                <th className="px-6 py-3 text-end font-medium">{t.inventory.reserved}</th>
                <th className="px-6 py-3 text-end font-medium">{t.inventory.available}</th>
                <th className="px-6 py-3 text-start font-medium">{t.common.status}</th>
                {canAdjustInventory ? <th className="px-6 py-3 text-start font-medium">{t.inventory.adjust}</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/products/${row.productId}`} className="font-medium text-slate-900 hover:text-blue-700">
                      {row.productName}
                    </Link>
                    <p className="mt-0.5 text-base font-bold text-slate-800">
                      {formatVariantAttributes(row.size, row.color, "—")}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{row.sku}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{row.quantityOnHand}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{row.quantityReserved}</td>
                  <td className="whitespace-nowrap px-6 py-3 text-end font-medium text-slate-900">{row.availableQuantity}</td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <StockBadge availableQuantity={row.availableQuantity} labels={t.catalog.stockLabels} />
                  </td>
                  {canAdjustInventory ? (
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <StockAdjustForm
                          labels={{ ...t.inventory, saving: t.catalog.form.saving }}
                          variantId={row.variantId}
                          warehouseId={row.warehouseId}
                          sku={row.sku}
                        />
                        <StockTransferForm
                          variantId={row.variantId}
                          fromWarehouseId={row.warehouseId}
                          fromWarehouseName={row.warehouseName}
                          fromBranchId={row.branchId}
                          productName={row.productName}
                          attributes={formatVariantAttributes(row.size, row.color, "")}
                          available={row.availableQuantity}
                          sku={row.sku}
                          targets={transferTargets}
                          labels={{
                            transfer: t.inventory.transfer,
                            transferTitle: t.inventory.transferTitle,
                            availableHere: t.inventory.availableHere,
                            item: t.inventory.variant,
                            from: t.inventory.warehouse,
                            toBranch: t.inventory.toBranch,
                            quantity: t.inventory.transferQuantity,
                            all: t.inventory.all,
                            confirmTransfer: t.inventory.confirmTransfer,
                            cancel: t.inventory.cancel,
                            noTargets: t.inventory.noTransferTargets,
                            autoWarehouse: t.inventory.autoWarehouse,
                          }}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
