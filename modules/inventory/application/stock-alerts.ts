import "server-only";

import { NotificationType } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { listStockAdjusters } from "@/modules/inventory/application/stock-requests";
import { createNotification } from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";
import { ConflictError, NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{8,15}$/;

export type StockAlertResult = { id: string; created: boolean };

/** Normalize an email or phone number into the value we will contact later. */
export function normalizeStockAlertContact(raw: string): string {
  const value = raw.trim();

  if (EMAIL_PATTERN.test(value)) {
    return value.toLowerCase();
  }

  const digits = value.replace(/[\s\-()]/g, "").replace(/^\+/, "");

  if (PHONE_PATTERN.test(digits)) {
    return value;
  }

  throw new ValidationError("Enter a valid email address or phone number.");
}

/** Remember that a customer wants a shout when an out-of-stock variant returns. */
export async function createStockAlert(
  input: { variantId: string; contact: string },
  locale: "ar" | "en" = "ar",
): Promise<StockAlertResult> {
  const variantId = typeof input.variantId === "string" ? input.variantId.trim() : "";

  if (!isUuid(variantId)) {
    throw new ValidationError("Choose a product option first.");
  }

  const contact = normalizeStockAlertContact(input.contact);

  const variant = await withDatabaseError(() =>
    prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        size: true,
        color: true,
        product: { select: { name: true } },
      },
    }),
  );

  if (variant === null) {
    throw new NotFoundError("Variant not found.");
  }

  const existing = await withDatabaseError(() =>
    prisma.stockAlert.findUnique({
      where: { variantId_contact: { variantId, contact } },
      select: { id: true },
    }),
  );

  if (existing !== null) {
    return { id: existing.id, created: false };
  }

  const alert = await withDatabaseError(() =>
    prisma.stockAlert.create({
      data: { variantId, contact },
      select: { id: true },
    }),
  );

  const detail = [variant.product.name, variant.size ? (locale === "ar" ? `مقاس ${variant.size}` : `size ${variant.size}`) : null, variant.color]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  const recipients = await listStockAdjusters();
  const title = locale === "ar" ? "عميل مستني مقاس يرجع للمخزون" : "A customer is waiting for a size";
  const body = locale === "ar" ? `${detail} — للتواصل: ${contact}` : `${detail} — contact: ${contact}`;

  for (const accountId of recipients) {
    await withDatabaseError(() =>
      createNotification(prisma, {
        accountId,
        type: NotificationType.INVENTORY,
        title,
        body,
        entityType: "StockAlert",
        entityId: alert.id,
      }),
    );
  }

  return { id: alert.id, created: true };
}

export type StockAlertRow = {
  id: string;
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  contact: string;
  status: "PENDING" | "NOTIFIED" | "CANCELLED";
  createdAt: Date;
};

/** Every restock request, newest first — pending ones lead. */
export async function listStockAlerts(_account: AuthenticatedAccount): Promise<StockAlertRow[]> {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW);

  const rows = await withDatabaseError(() =>
    prisma.stockAlert.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        variantId: true,
        contact: true,
        status: true,
        createdAt: true,
        variant: { select: { sku: true, size: true, color: true, product: { select: { name: true } } } },
      },
    }),
  );

  return rows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    productName: row.variant.product.name,
    sku: row.variant.sku,
    size: row.variant.size,
    color: row.variant.color,
    contact: row.contact,
    status: row.status,
    createdAt: row.createdAt,
  }));
}

/** Close the loop on one request: the customer was told, or the request was dropped. */
export async function resolveStockAlert(
  _account: AuthenticatedAccount,
  alertId: string,
  status: "NOTIFIED" | "CANCELLED",
): Promise<{ id: string; status: "NOTIFIED" | "CANCELLED" }> {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);

  if (!isUuid(alertId)) {
    throw new ValidationError("Invalid alert.", { alertId: "invalid" });
  }

  const result = await withDatabaseError(() =>
    prisma.stockAlert.updateMany({
      where: { id: alertId, status: "PENDING" },
      data: { status },
    }),
  );

  if (result.count === 0) {
    const existing = await withDatabaseError(() =>
      prisma.stockAlert.findUnique({ where: { id: alertId }, select: { status: true } }),
    );

    if (existing === null) {
      throw new NotFoundError("Alert not found.");
    }

    throw new ConflictError("This alert was already handled.");
  }

  return { id: alertId, status };
}

const RESTOCK_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/**
 * When a waited-for variant comes back in stock, tell the warehouse people in
 * their own language — at most once per half day so a busy restock day does not
 * turn into a stream of identical notifications.
 */
export async function announceRestock(variantId: string): Promise<void> {
  if (!isUuid(variantId)) {
    return;
  }

  const pending = await withDatabaseError(() =>
    prisma.stockAlert.count({ where: { variantId, status: "PENDING" } }),
  );

  if (pending === 0) {
    return;
  }

  const recent = await withDatabaseError(() =>
    prisma.notification.findFirst({
      where: {
        entityType: "StockAlert",
        entityId: variantId,
        createdAt: { gte: new Date(Date.now() - RESTOCK_COOLDOWN_MS) },
      },
      select: { id: true },
    }),
  );

  if (recent !== null) {
    return;
  }

  const totals = await withDatabaseError(() =>
    prisma.inventoryItem.aggregate({
      where: { variantId, warehouse: { isActive: true } },
      _sum: { quantityOnHand: true, quantityReserved: true },
    }),
  );

  const available = (totals._sum.quantityOnHand ?? 0) - (totals._sum.quantityReserved ?? 0);

  if (available <= 0) {
    return;
  }

  const variant = await withDatabaseError(() =>
    prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { size: true, color: true, product: { select: { name: true } } },
    }),
  );

  if (variant === null) {
    return;
  }

  const recipients = await listStockAdjusters();

  if (recipients.length === 0) {
    return;
  }

  const accounts = await withDatabaseError(() =>
    prisma.account.findMany({
      where: { id: { in: recipients } },
      select: { id: true, preferredLanguage: true },
    }),
  );

  for (const recipient of accounts) {
    const ar = (recipient.preferredLanguage ?? "ar") !== "en";
    const detail = [
      variant.product.name,
      variant.size ? (ar ? `مقاس ${variant.size}` : `size ${variant.size}`) : null,
      variant.color,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" · ");

    await withDatabaseError(() =>
      createNotification(prisma, {
        accountId: recipient.id,
        type: NotificationType.INVENTORY,
        title: ar ? "مقاس مستني رجع للمخزون" : "A waited-for size is back in stock",
        body: ar ? `${detail} — ${pending} عميل مستني، كلّمهم` : `${detail} — ${pending} customers waiting, contact them`,
        entityType: "StockAlert",
        entityId: variantId,
      }),
    );
  }
}
