import Link from "next/link";
import { redirect } from "next/navigation";

import { StockBadge } from "@/components/products/stock-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getInventoryPage } from "@/modules/inventory/application/inventory";
import {
  GLOBAL_BRANCH_SCOPE,
  resolveBranchScope,
  scopeDescription,
  type BranchScope,
} from "@/modules/branches/application/scope";
import { StockAdjustForm } from "@/modules/inventory/components/stock-adjust-form";
import { StockTransferForm } from "@/modules/inventory/components/stock-transfer-form";
import { listTransferTargets } from "@/modules/inventory/application/transfers";
import type { InventoryPageView } from "@/modules/inventory/types";
import { formatDate, formatVariantAttributes } from "@/src/lib/format";
import { parsePaginationParams } from "@/src/lib/validation";
import { listVariantsWithoutBalances } from "@/modules/inventory/application/inventory";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

const PAGE_SIZE = 10;

type InventoryPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const account = await getCurrentAccount();
  const { t } = await getInterfaceLanguage();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const canViewInventory = permissions.has(PERMISSIONS.INVENTORY_VIEW);
  const canAdjustInventory = permissions.has(PERMISSIONS.INVENTORY_ADJUST);
  const transferTargets = canAdjustInventory ? await listTransferTargets() : [];

  if (!canViewInventory) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">{t.inventory.permissionTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {t.inventory.permissionHint}
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    );
  }

  const params = await searchParams;
  const searchParamsObject = new URLSearchParams();

  if (params.offset !== undefined) searchParamsObject.set("offset", params.offset);
  if (params.limit !== undefined) searchParamsObject.set("limit", params.limit);
  else searchParamsObject.set("limit", String(PAGE_SIZE));

  let page: InventoryPageView | null = null;
  let scope: BranchScope = GLOBAL_BRANCH_SCOPE;
  let loadError = false;

  try {
    scope = await resolveBranchScope(account);
    page = await getInventoryPage(parsePaginationParams(searchParamsObject), scope);
  } catch {
    loadError = true;
  }

  if (loadError || page === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">{t.inventory.loadErrorTitle}</h3>
        <p className="mt-1 text-sm text-rose-700">{t.common.refreshHint}</p>
      </section>
    );
  }

  const variantsWithoutBalances = canAdjustInventory ? await listVariantsWithoutBalances() : [];

  const { rows, summary, pagination } = page;
  const rangeStart = rows.length === 0 ? pagination.offset : pagination.offset + 1;
  const rangeEnd = pagination.offset + rows.length;
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + rows.length < pagination.total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{t.inventory.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t.inventory.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {scopeDescription(scope, t.scope)} — {t.inventory.subtitle}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.trackedBalances}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.trackedRows}</p>
          <p className="mt-1 text-xs text-slate-400">{t.inventory.rowsHint}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.onHand}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalOnHand}</p>
          <p className="mt-1 text-xs text-slate-400">{t.inventory.reservedHint.replace("{count}", String(summary.totalReserved))}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.available}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalAvailable}</p>
          <p className="mt-1 text-xs text-slate-400">{t.inventory.onHandMinusReserved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.inventory.lowOrOut}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {summary.lowStockRows} / {summary.outOfStockRows}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t.inventory.lowOrOutHint}</p>
        </div>
      </section>

      {canAdjustInventory ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{t.inventory.noBalanceTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{t.inventory.noBalanceHint}</p>

          {variantsWithoutBalances.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t.inventory.noBalanceEmpty}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {variantsWithoutBalances.map((variant) => (
                <li key={variant.variantId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/products/${variant.productId}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                      {variant.productName}
                    </Link>
                    <p className="text-base font-bold text-slate-800">
                      {formatVariantAttributes(variant.size, variant.color, "—")}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{variant.sku}</p>
                  </div>
                  <StockAdjustForm
                    variantId={variant.variantId}
                    sku={variant.sku}
                    labels={{ ...t.inventory, saving: t.catalog.form.saving }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">{t.inventory.emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.inventory.emptyHint}
          </p>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.inventory.productVariant}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.warehouse}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.onHand}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.reserved}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.available}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.status}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.updated}</th>
                  {canAdjustInventory ? <th scope="col" className="px-6 py-3">{t.inventory.adjust}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/products/${row.productId}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {row.productName}
                      </Link>
                      <p className="mt-0.5 text-base font-bold text-slate-800">
                        {formatVariantAttributes(row.size, row.color, "—")}
                      </p>
                      <p className="font-mono text-xs text-slate-400">{row.sku}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                      {row.warehouseName}
                      <span className="ms-1 text-xs text-slate-400">({row.warehouseCode})</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">{row.quantityOnHand}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-end text-slate-700">{row.quantityReserved}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-end font-medium text-slate-900">
                      {row.availableQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StockBadge availableQuantity={row.availableQuantity} labels={t.catalog.stockLabels} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(row.updatedAt)}</td>
                    {canAdjustInventory ? (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-start gap-2">
                          <StockAdjustForm labels={{ ...t.inventory, saving: t.catalog.form.saving }} variantId={row.variantId} warehouseId={row.warehouseId} sku={row.sku} />
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
                            }}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Mobile cards */}
          <section className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${row.productId}`} className="truncate font-semibold text-slate-900">
                      {row.productName}
                    </Link>
                    <p className="truncate text-base font-bold text-slate-800">
                      {formatVariantAttributes(row.size, row.color, "—")}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-400">{row.sku}</p>
                  </div>
                  <StockBadge availableQuantity={row.availableQuantity} labels={t.catalog.stockLabels} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">{t.inventory.warehouse}</dt>
                    <dd className="text-slate-800">{row.warehouseCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.inventory.onHand}</dt>
                    <dd className="text-slate-800">{row.quantityOnHand}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.inventory.reserved}</dt>
                    <dd className="text-slate-800">{row.quantityReserved}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">{t.inventory.available}</dt>
                    <dd className="font-medium text-slate-900">{row.availableQuantity}</dd>
                  </div>
                </dl>
                {canAdjustInventory ? (
                  <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-slate-100 pt-4">
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
                      }}
                    />
                    <StockAdjustForm labels={{ ...t.inventory, saving: t.catalog.form.saving }} variantId={row.variantId} warehouseId={row.warehouseId} sku={row.sku} />
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">
              Showing <span className="font-medium text-slate-900">{rangeStart}</span>–
              <span className="font-medium text-slate-900">{rangeEnd}</span> of{" "}
              <span className="font-medium text-slate-900">{pagination.total}</span>
            </p>
            <div className="flex items-center gap-2">
              {hasPrevious ? (
                <Link
                  href={`/inventory?offset=${Math.max(pagination.offset - pagination.limit, 0)}&limit=${pagination.limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.previous}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.previous}</span>
              )}
              {hasNext ? (
                <Link
                  href={`/inventory?offset=${pagination.offset + pagination.limit}&limit=${pagination.limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t.common.next}
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.next}</span>
              )}
            </div>
          </section>
        </>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t.inventory.movementsTitle}</h3>
          <p className="text-sm text-slate-500">{t.inventory.ledgerNote}</p>
        </div>
        <Link
          href="/inventory/movements"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {t.inventory.viewMovements}
        </Link>
      </section>
    </div>
  );
}
