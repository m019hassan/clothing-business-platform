import Link from "next/link";
import { redirect } from "next/navigation";

import { StockBadge } from "@/components/products/stock-badge";
import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getInventoryPage } from "@/modules/inventory/application/inventory";
import type { InventoryPageView } from "@/modules/inventory/types";
import { formatDate, formatVariantAttributes } from "@/src/lib/format";
import { parsePaginationParams } from "@/src/lib/validation";

const PAGE_SIZE = 10;

type InventoryPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();
  const canViewInventory = permissions.has(PERMISSIONS.INVENTORY_VIEW);

  if (!canViewInventory) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="text-sm font-semibold text-slate-800">Inventory access requires a staff role</p>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have the inventory.view permission. Ask a manager to grant it.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Back to dashboard
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
  let loadError = false;

  try {
    page = await getInventoryPage(parsePaginationParams(searchParamsObject));
  } catch {
    loadError = true;
  }

  if (loadError || page === null) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h3 className="text-sm font-semibold text-rose-800">Unable to load inventory</h3>
        <p className="mt-1 text-sm text-rose-700">Please refresh the page to try again.</p>
      </section>
    );
  }

  const { rows, summary, pagination } = page;
  const rangeStart = rows.length === 0 ? pagination.offset : pagination.offset + 1;
  const rangeEnd = pagination.offset + rows.length;
  const hasPrevious = pagination.offset > 0;
  const hasNext = pagination.offset + rows.length < pagination.total;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Operations</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Inventory</h2>
        <p className="mt-1 text-sm text-slate-600">
          Read-only view of stock balances per warehouse. Stock changes flow through carts and orders only.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tracked balances</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.trackedRows}</p>
          <p className="mt-1 text-xs text-slate-400">Variant × warehouse rows</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">On hand</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalOnHand}</p>
          <p className="mt-1 text-xs text-slate-400">Reserved {summary.totalReserved}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Available</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{summary.totalAvailable}</p>
          <p className="mt-1 text-xs text-slate-400">On hand minus reserved</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Low / out of stock</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {summary.lowStockRows} / {summary.outOfStockRows}
          </p>
          <p className="mt-1 text-xs text-slate-400">Below 10 available / none available</p>
        </div>
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-semibold text-slate-800">No inventory balances yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Stock rows are created when inventory is recorded for a variant in a warehouse.
          </p>
        </section>
      ) : (
        <>
          {/* Desktop table */}
          <section className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Product / variant</th>
                  <th scope="col" className="px-6 py-3">Warehouse</th>
                  <th scope="col" className="px-6 py-3 text-right">On hand</th>
                  <th scope="col" className="px-6 py-3 text-right">Reserved</th>
                  <th scope="col" className="px-6 py-3 text-right">Available</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link href={`/products/${row.productId}`} className="font-medium text-slate-900 hover:text-blue-700">
                        {row.productName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {row.sku}
                        {row.size || row.color ? ` · ${formatVariantAttributes(row.size, row.color, "")}` : ""}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                      {row.warehouseName}
                      <span className="ml-1 text-xs text-slate-400">({row.warehouseCode})</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">{row.quantityOnHand}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-700">{row.quantityReserved}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-slate-900">
                      {row.availableQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StockBadge availableQuantity={row.availableQuantity} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(row.updatedAt)}</td>
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
                    <p className="truncate text-xs text-slate-500">{row.sku}</p>
                  </div>
                  <StockBadge availableQuantity={row.availableQuantity} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Warehouse</dt>
                    <dd className="text-slate-800">{row.warehouseCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">On hand</dt>
                    <dd className="text-slate-800">{row.quantityOnHand}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Reserved</dt>
                    <dd className="text-slate-800">{row.quantityReserved}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Available</dt>
                    <dd className="font-medium text-slate-900">{row.availableQuantity}</dd>
                  </div>
                </dl>
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
                  Previous
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Previous</span>
              )}
              {hasNext ? (
                <Link
                  href={`/inventory?offset=${pagination.offset + pagination.limit}&limit=${pagination.limit}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Next
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">Next</span>
              )}
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Stock adjustments and movement history</h3>
        <p className="mt-1 text-sm text-slate-500">
          There is no adjustment or stock-movement API yet, so this screen is read-only. Stock changes are
          recorded only through cart reservations and order lifecycle events.
        </p>
      </section>
    </div>
  );
}
