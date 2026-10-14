import "server-only";

import { NotificationType } from "@prisma/client";

import { listStockAdjusters } from "@/modules/inventory/application/stock-requests";
import { createNotification } from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

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
