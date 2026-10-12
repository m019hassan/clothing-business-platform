import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { PromotionStatus, PromotionView } from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export const DISCOUNT_MIN_PERCENT = 1;
export const DISCOUNT_MAX_PERCENT = 90;

/** Sale price for a campaign percent, rounded to the shop's two decimals. */
export function discountedAmount(price: Prisma.Decimal, percent: number): Prisma.Decimal {
  return price.mul(100 - percent).div(100).toDecimalPlaces(2);
}

/** The highest percent wins when several campaigns target the same product. */
export function pickBestDiscounts(entries: { productId: string; percent: number }[]): Map<string, number> {
  const best = new Map<string, number>();

  for (const entry of entries) {
    const current = best.get(entry.productId);

    if (current === undefined || entry.percent > current) {
      best.set(entry.productId, entry.percent);
    }
  }

  return best;
}

/** Campaigns end by themselves: only a stop, the clock decides the rest. */
export function promotionStatus(
  promotion: { isActive: boolean; startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): PromotionStatus {
  if (!promotion.isActive) {
    return "STOPPED";
  }

  if (now < promotion.startsAt) {
    return "UPCOMING";
  }

  if (now > promotion.endsAt) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

export function parsePromotionInput(
  payload: unknown,
): { name: string; percent: number; startsAt: Date; endsAt: Date; productIds: string[] } {
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name.length < 2 || name.length > 120) {
    throw new ValidationError("name must be between 2 and 120 characters.");
  }

  const percent = typeof body.percent === "number" ? body.percent : Number(body.percent);

  if (!Number.isInteger(percent) || percent < DISCOUNT_MIN_PERCENT || percent > DISCOUNT_MAX_PERCENT) {
    throw new ValidationError(
      `percent must be a whole number between ${DISCOUNT_MIN_PERCENT} and ${DISCOUNT_MAX_PERCENT}.`,
    );
  }

  const startsAt = new Date(typeof body.startsAt === "string" ? body.startsAt : NaN);
  const endsAt = new Date(typeof body.endsAt === "string" ? body.endsAt : NaN);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new ValidationError("startsAt and endsAt must be valid dates.");
  }

  if (startsAt.getTime() >= endsAt.getTime()) {
    throw new ValidationError("startsAt must be before endsAt.");
  }

  const ids = Array.isArray(body.productIds)
    ? body.productIds.filter((value): value is string => typeof value === "string" && isUuid(value))
    : [];
  const productIds = [...new Set(ids)];

  if (productIds.length === 0) {
    throw new ValidationError("Select at least one product.");
  }

  if (productIds.length > 200) {
    throw new ValidationError("Too many products selected (maximum 200).");
  }

  return { name, percent, startsAt, endsAt, productIds };
}

const promotionInclude = {
  products: { select: { productId: true, product: { select: { name: true } } } },
} satisfies Prisma.PromotionInclude;

type PromotionRecord = Prisma.PromotionGetPayload<{ include: typeof promotionInclude }>;

function toView(promotion: PromotionRecord, now: Date = new Date()): PromotionView {
  return {
    id: promotion.id,
    name: promotion.name,
    percent: promotion.percent,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
    isActive: promotion.isActive,
    status: promotionStatus(promotion, now),
    productCount: promotion.products.length,
    productNames: promotion.products.map((entry) => entry.product.name),
    createdAt: promotion.createdAt.toISOString(),
  };
}

/** The percent map for right now: active campaigns only, highest wins. */
export async function getActiveDiscountMap(
  client: Prisma.TransactionClient | typeof prisma = prisma,
  now: Date = new Date(),
): Promise<Map<string, number>> {
  const promotions = await client.promotion.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
    select: { percent: true, products: { select: { productId: true } } },
  });

  return pickBestDiscounts(
    promotions.flatMap((promotion) =>
      promotion.products.map((entry) => ({ productId: entry.productId, percent: promotion.percent })),
    ),
  );
}

export async function listPromotions(): Promise<PromotionView[]> {
  return withDatabaseError(async () => {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" },
      include: promotionInclude,
    });

    return promotions.map((promotion) => toView(promotion));
  });
}

export async function createPromotion(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<PromotionView> {
  await requirePermission(PERMISSIONS.DISCOUNTS_MANAGE);
  const input = parsePromotionInput(payload);

  const existing = await withDatabaseError(() =>
    prisma.product.count({ where: { id: { in: input.productIds }, deletedAt: null } }),
  );

  if (existing !== input.productIds.length) {
    throw new ValidationError("One or more selected products do not exist.");
  }

  const promotion = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.promotion.create({
        data: {
          name: input.name,
          percent: input.percent,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          createdByAccountId: account.id,
          products: { create: input.productIds.map((productId) => ({ productId })) },
        },
        include: promotionInclude,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PROMOTION_CREATED",
          entity: "Promotion",
          entityId: created.id,
          newValue: `${created.name} — ${created.percent}%`,
        },
      });

      return created;
    }),
  );

  return toView(promotion);
}

export async function setPromotionActive(
  account: AuthenticatedAccount,
  promotionId: string,
  isActive: boolean,
): Promise<PromotionView> {
  await requirePermission(PERMISSIONS.DISCOUNTS_MANAGE);

  if (!isUuid(promotionId)) {
    throw new NotFoundError("Promotion not found.");
  }

  const promotion = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const current = await transaction.promotion.findUnique({
        where: { id: promotionId },
        select: { id: true, isActive: true },
      });

      if (!current) {
        throw new NotFoundError("Promotion not found.");
      }

      const updated = await transaction.promotion.update({
        where: { id: promotionId },
        data: { isActive },
        include: promotionInclude,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PROMOTION_UPDATED",
          entity: "Promotion",
          entityId: promotionId,
          oldValue: current.isActive ? "active" : "stopped",
          newValue: isActive ? "active" : "stopped",
        },
      });

      return updated;
    }),
  );

  return toView(promotion);
}

export async function deletePromotion(account: AuthenticatedAccount, promotionId: string): Promise<{ name: string }> {
  await requirePermission(PERMISSIONS.DISCOUNTS_MANAGE);

  if (!isUuid(promotionId)) {
    throw new NotFoundError("Promotion not found.");
  }

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const promotion = await transaction.promotion.findUnique({
        where: { id: promotionId },
        select: { id: true, name: true },
      });

      if (!promotion) {
        throw new NotFoundError("Promotion not found.");
      }

      await transaction.promotion.delete({ where: { id: promotionId } });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PROMOTION_DELETED",
          entity: "Promotion",
          entityId: promotionId,
          newValue: promotion.name,
        },
      });

      return { name: promotion.name };
    }),
  );
}
