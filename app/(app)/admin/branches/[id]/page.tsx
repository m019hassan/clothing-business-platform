import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { getBranchDetails } from "@/modules/branches/application/branch-details";
import { formatDate, formatDateTime, formatMoney } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { NotFoundError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export default async function BranchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const { id } = await params;

  let branch;

  try {
    branch = await getBranchDetails(account, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }

    throw error;
  }

  const salesHint = (orders: number, items: number) =>
    t.branchDetails.salesHint.replace("{orders}", String(orders)).replace("{items}", String(items));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/branches" className="text-sm text-blue-700 hover:underline">
            ← {t.branchDetails.back}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {branch.name} <span className="text-sm font-normal text-slate-500">({branch.code})</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {[
              branch.city,
              branch.phone,
              `${t.branchDetails.created}: ${formatDate(branch.createdAt)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            branch.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {branch.isActive ? t.branchDetails.active : t.branchDetails.inactive}
        </span>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.branchDetails.salesToday}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(branch.sales.today.total, "EGP")}
          </p>
          <p className="mt-1 text-xs text-slate-400">{salesHint(branch.sales.today.orders, branch.sales.today.items)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.branchDetails.salesMonth}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatMoney(branch.sales.month.total, "EGP")}
          </p>
          <p className="mt-1 text-xs text-slate-400">{salesHint(branch.sales.month.orders, branch.sales.month.items)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.branchDetails.stockBlock}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{branch.stock.available}</p>
          <p className="mt-1 text-xs text-slate-400">
            {t.branchDetails.stockOnHand}: {branch.stock.onHand}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{t.branchDetails.staff}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {branch.staff.employees + branch.staff.distributors}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.branchDetails.employees}: {branch.staff.employees} · {t.branchDetails.distributors}:{" "}
            {branch.staff.distributors} · {t.branchDetails.customers}: {branch.staff.customers}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{t.branchDetails.warehouses}</h3>
        </div>
        {branch.warehouses.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3 text-start">{t.branchDetails.warehouseName}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.branchDetails.stockOnHand}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.branchDetails.stockAvailable}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.branchDetails.warehouseTracked}</th>
                  <th scope="col" className="px-6 py-3 text-start">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branch.warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{warehouse.name}</p>
                      <p className="font-mono text-xs text-slate-400">{warehouse.code}</p>
                    </td>
                    <td className="px-6 py-3 text-end text-slate-700">{warehouse.onHand}</td>
                    <td className="px-6 py-3 text-end font-medium text-slate-900">{warehouse.available}</td>
                    <td className="px-6 py-3 text-end text-slate-700">{warehouse.trackedItems}</td>
                    <td className="px-6 py-3">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          warehouse.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {warehouse.isActive ? t.branchDetails.active : t.branchDetails.inactive}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">{t.branchDetails.recentSales}</h3>
          {branch.recentSales.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t.branchDetails.noSales}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {branch.recentSales.map((sale) => (
                <li key={sale.orderId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-slate-900">{sale.orderNumber}</p>
                    <p className="text-xs text-slate-500">{formatDate(sale.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-slate-800">
                    {formatMoney(sale.total, sale.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">{t.branchDetails.recentMovements}</h3>
            <Link
              href="/inventory/movements"
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              {t.branchDetails.viewAllMovements}
            </Link>
          </div>
          {branch.recentMovements.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{t.branchDetails.noMovements}</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {branch.recentMovements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{movement.productName}</p>
                    <p className="truncate text-sm font-bold text-slate-700">
                      {[movement.size, movement.color].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="truncate font-mono text-[11px] text-slate-400">{movement.sku}</p>
                    <p className="text-xs text-slate-500">
                      {(t.movementTypes as Record<string, string>)[movement.type] ?? movement.type} ·{" "}
                      {formatDateTime(movement.createdAt)}
                      {movement.actorName ? ` · ${movement.actorName}` : ""}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 text-sm font-medium",
                      movement.quantityChange >= 0 ? "text-emerald-700" : "text-rose-700",
                    ].join(" ")}
                  >
                    {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
