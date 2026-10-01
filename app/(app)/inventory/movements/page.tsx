import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listStockMovements } from "@/modules/inventory/application/movements";
import { formatDateTime } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type MovementsPageProps = {
  searchParams: Promise<{ offset?: string; limit?: string }>;
};

export default async function StockMovementsPage({ searchParams }: MovementsPageProps) {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const { t } = await getInterfaceLanguage();
  const params = await searchParams;
  const search = new URLSearchParams();

  if (params.offset !== undefined) search.set("offset", params.offset);
  if (params.limit !== undefined) search.set("limit", params.limit);
  else search.set("limit", String(PAGE_SIZE));

  const pagination = parsePaginationParams(search);
  const ledger = await listStockMovements(account, pagination);

  const rangeStart = ledger.pagination.total === 0 ? 0 : ledger.pagination.offset + 1;
  const rangeEnd = Math.min(ledger.pagination.offset + ledger.pagination.limit, ledger.pagination.total);
  const hasPrevious = ledger.pagination.offset > 0;
  const hasNext = ledger.pagination.offset + ledger.pagination.limit < ledger.pagination.total;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <Link href="/inventory" className="text-sm text-blue-700 hover:underline">
          ← {t.inventory.title ?? t.nav.inventory}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{t.inventory.movementsTitle}</h1>
        <p className="text-sm text-slate-600">{t.inventory.ledgerNote}</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {ledger.movements.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">{t.inventory.noMovements}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">{t.inventory.movementType}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.variant}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.onHandChange}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.onHandAfter}</th>
                  <th scope="col" className="px-6 py-3 text-end">{t.inventory.reservedAfter}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.reason}</th>
                  <th scope="col" className="px-6 py-3">{t.inventory.when}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {(t.movementTypes as Record<string, string>)[movement.type] ?? movement.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-900">{movement.sku}</p>
                      <p className="text-xs text-slate-500">{movement.warehouseCode}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">
                      {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{movement.quantityOnHandAfter}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-end text-slate-700">{movement.quantityReservedAfter}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {movement.reason ?? "—"}
                      {movement.orderId ? <span className="ms-1 text-xs text-slate-400">{t.inventory.orderTag}</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500">{formatDateTime(movement.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">
          {t.common.showing} <span className="font-medium text-slate-900">{rangeStart}</span>–
          <span className="font-medium text-slate-900">{rangeEnd}</span> {t.common.of}{" "}
          <span className="font-medium text-slate-900">{ledger.pagination.total}</span>
        </p>
        <div className="flex items-center gap-2">
          {hasPrevious ? (
            <Link
              href={`/inventory/movements?offset=${Math.max(ledger.pagination.offset - ledger.pagination.limit, 0)}&limit=${ledger.pagination.limit}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {t.common.previous}
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.previous}</span>
          )}
          {hasNext ? (
            <Link
              href={`/inventory/movements?offset=${ledger.pagination.offset + ledger.pagination.limit}&limit=${ledger.pagination.limit}`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              {t.common.next}
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-slate-400">{t.common.next}</span>
          )}
        </div>
      </section>
    </div>
  );
}
