import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listWarehouses } from "@/modules/branches/application/warehouses";
import { listStockRequests } from "@/modules/inventory/application/stock-requests";
import { StockRequestActions } from "@/modules/inventory/components/stock-request-actions";
import { formatDateTime, formatVariantAttributes } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  FULFILLED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
};

export default async function StockRequestsPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  const canFulfill = permissions.has(PERMISSIONS.INVENTORY_ADJUST);
  const { t } = await getInterfaceLanguage();
  const requests = await listStockRequests(account);
  const storages = canFulfill ? await listWarehouses("STORAGE") : [];
  const warehouses = storages.map((warehouse) => ({ id: warehouse.id, name: warehouse.name, code: warehouse.code }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-blue-700 hover:underline">
          ← {t.inventory.title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.inventory.requestsTitle}</h1>
        <p className="text-sm text-slate-600">{t.inventory.requestsSubtitle}</p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          {t.inventory.requestsEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {request.branchName} ({request.branchCode})
                    </p>
                    <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[request.status]].join(" ")}>
                      {request.status === "PENDING"
                        ? t.inventory.statusPending
                        : request.status === "FULFILLED"
                          ? t.inventory.statusFulfilled
                          : t.inventory.statusCancelled}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(request.createdAt)}</span>
                  </div>
                  <ul className="space-y-0.5 text-xs text-slate-600">
                    {request.items.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        {item.productName} · {formatVariantAttributes(item.size, item.color, "—")} — <b>{item.quantity}</b>{" "}
                        <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                      </li>
                    ))}
                    {request.items.length > 5 ? <li className="text-slate-400">… +{request.items.length - 5}</li> : null}
                  </ul>
                  {request.note ? <p className="text-xs text-slate-400">📝 {request.note}</p> : null}
                </div>
                <StockRequestActions
                  requestId={request.id}
                  status={request.status}
                  canCancel={request.requestedByAccountId === account.id}
                  canFulfill={canFulfill}
                  warehouses={warehouses}
                  labels={{
                    cancel: t.inventory.cancelRequest,
                    cancelling: t.inventory.cancelling,
                    fulfill: t.inventory.fulfill,
                    fulfilling: t.inventory.fulfilling,
                    pick: t.inventory.fulfillPick,
                    confirm: t.inventory.fulfillConfirm,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
