import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { ValidationError, withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;
type DbClient = Prisma.TransactionClient | typeof prisma;

const TAX_SETTING_ID = "default";
const FALLBACK: TaxSettingView = { enabled: false, ratePercent: "0.00", inclusive: true };

export type TaxSettingView = { enabled: boolean; ratePercent: string; inclusive: boolean };

/** The shop-wide VAT switch; "off" until the first save. */
export async function getTaxSetting(client: DbClient = prisma): Promise<TaxSettingView> {
  const record = await client.taxSetting.findUnique({
    where: { id: TAX_SETTING_ID },
    select: { enabled: true, ratePercent: true, inclusive: true },
  });

  if (record === null) {
    return FALLBACK;
  }

  return {
    enabled: record.enabled,
    ratePercent: record.ratePercent.toFixed(2),
    inclusive: record.inclusive,
  };
}

/** Validates the settings payload; the rate may be any value between 0 and 100. */
export function parseTaxPayload(payload: unknown): {
  enabled: boolean;
  ratePercent: Prisma.Decimal;
  inclusive: boolean;
} {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;
  const enabled = body.enabled === true;
  const inclusive = body.inclusive !== false;
  const raw =
    typeof body.ratePercent === "number"
      ? String(body.ratePercent)
      : typeof body.ratePercent === "string"
        ? body.ratePercent.trim()
        : "";

  if (raw === "") {
    throw new ValidationError("ratePercent is required.");
  }

  let rate: Prisma.Decimal;

  try {
    rate = new Prisma.Decimal(raw);
  } catch {
    throw new ValidationError("ratePercent must be a number.");
  }

  if (rate.lt(0) || rate.gt(100)) {
    throw new ValidationError("ratePercent must be between 0 and 100.");
  }

  return { enabled, ratePercent: rate.toDecimalPlaces(2), inclusive };
}

/** Staff save of the shop VAT settings. Requires products.update. */
export async function saveTaxSetting(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<TaxSettingView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  const input = parseTaxPayload(payload);

  return withDatabaseError(async () => {
    const saved = await prisma.taxSetting.upsert({
      where: { id: TAX_SETTING_ID },
      create: { id: TAX_SETTING_ID, ...input },
      update: input,
      select: { enabled: true, ratePercent: true, inclusive: true },
    });

    return {
      enabled: saved.enabled,
      ratePercent: saved.ratePercent.toFixed(2),
      inclusive: saved.inclusive,
    };
  });
}

/**
 * Splits one line's money into the tax part and what the customer pays.
 * Inclusive: the shelf price already holds the tax. Exclusive: tax is added on top.
 */
export function computeLineTax(
  lineTotal: Prisma.Decimal,
  ratePercent: Prisma.Decimal,
  inclusive: boolean,
): { taxAmount: Prisma.Decimal; payable: Prisma.Decimal } {
  if (ratePercent.lte(0)) {
    return { taxAmount: new Prisma.Decimal(0), payable: lineTotal };
  }

  if (inclusive) {
    const tax = lineTotal.mul(ratePercent).div(ratePercent.add(100)).toDecimalPlaces(2);

    return { taxAmount: tax, payable: lineTotal };
  }

  const tax = lineTotal.mul(ratePercent).div(100).toDecimalPlaces(2);

  return { taxAmount: tax, payable: lineTotal.add(tax) };
}

/** Is this product exempt from VAT? Read for the product page toggle. */
export async function getProductTaxExemption(productId: string): Promise<boolean> {
  if (!productId) {
    return false;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { taxExempt: true },
  });

  return product?.taxExempt ?? false;
}

/** Flip one product between taxable and exempt. Requires products.update. */
export async function setProductTaxExemption(
  account: AuthenticatedAccount,
  productId: string,
  taxExempt: boolean,
): Promise<{ id: string; taxExempt: boolean }> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!productId) {
    throw new ValidationError("A product id is required.");
  }

  return withDatabaseError(async () => {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { taxExempt },
      select: { id: true, taxExempt: true },
    });

    return updated;
  });
}
