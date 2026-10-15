import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPermissions } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { getCurrentAccount } from "@/modules/auth/infrastructure/session";
import { listStockAlerts } from "@/modules/inventory/application/stock-alerts";
import { StockAlertActions } from "@/modules/inventory/components/stock-alert-actions";
import { formatDateTime } from "@/src/lib/format";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  NOTIFIED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
};

export default async function StockAlertsPage() {
  const account = await getCurrentAccount();

  if (!account) {
    redirect("/login");
  }

  const permissions = await getCurrentPermissions();

  if (!permissions.has(PERMISSIONS.INVENTORY_VIEW)) {
    redirect("/inventory");
  }

  const canResolve = permissions.has(PERMISSIONS.INVENTORY_ADJUST);
  const { t } = await getInterfaceLanguage();
  const alerts = await listStockAlerts(account);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inventory" className="text-sm text-blue-700 hover:underline">
          ← {t.inventory.title}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{t.inventory.alertsTitle}</h1>
        <p className="text-sm text-slate-600">{t.inventory.alertsSubtitle}</p>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
          {t.inventory.alertsEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{alert.productName}</p>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_CLASS[alert.status],
                      ].join(" ")}
                    >
                      {alert.status === "PENDING"
                        ? t.inventory.statusPending
                        : alert.status === "NOTIFIED"
                          ? t.inventory.alertNotified
                          : t.inventory.statusCancelled}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(alert.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-mono">{alert.sku}</span>
                    {alert.size || alert.color
                      ? ` · ${[alert.size, alert.color].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t.inventory.alertContact}:{" "}
                    <a
                      href={alert.contact.includes("@") ? `mailto:${alert.contact}` : `tel:${alert.contact}`}
                      className="font-mono text-blue-700 hover:underline"
                      dir="ltr"
                    >
                      {alert.contact}
                    </a>
                  </p>
                </div>

                <StockAlertActions
                  alertId={alert.id}
                  status={alert.status}
                  canResolve={canResolve}
                  labels={{
                    notified: t.inventory.alertMarkNotified,
                    notifiedBusy: t.inventory.alertMarkNotifiedBusy,
                    dismiss: t.inventory.alertDismiss,
                    dismissBusy: t.inventory.alertDismissBusy,
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
