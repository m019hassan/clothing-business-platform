import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type Actor = NonNullable<SafeAccount>;

export type SizeOptionView = {
  id: string;
  label: string;
  ageLabel: string;
  /** How many variants already use this size. */
  usageCount: number;
};

/**
 * Numeric labels come first in numeric order (5, 6, … 10, … 30); anything else keeps
 * the insertion order after them, so "XL" never lands between "9" and "10".
 */
function orderSizes<T extends { label: string }>(sizes: T[]): T[] {
  const numeric = (label: string) => (/^\d+$/.test(label) ? Number(label) : null);

  return [...sizes].sort((left, right) => {
    const leftValue = numeric(left.label);
    const rightValue = numeric(right.label);

    if (leftValue !== null && rightValue !== null) {
      return leftValue - rightValue;
    }

    if (leftValue !== null) {
      return -1;
    }

    if (rightValue !== null) {
      return 1;
    }

    return left.label.localeCompare(right.label);
  });
}

/** Every size of the shared library, each with the age it fits. */
export async function listSizeOptions(): Promise<SizeOptionView[]> {
  await requirePermission(PERMISSIONS.PRODUCTS_VIEW);

  const sizes = await prisma.sizeOption.findMany();
  const usage = await prisma.productVariant.groupBy({
    by: ["size"],
    where: { size: { not: null } },
    _count: { _all: true },
  });
  const usageByLabel = new Map(usage.map((entry) => [entry.size ?? "", entry._count._all]));

  return orderSizes(sizes).map((size) => ({
    id: size.id,
    label: size.label,
    ageLabel: size.ageLabel,
    usageCount: usageByLabel.get(size.label) ?? 0,
  }));
}

/** Adds a size to the library. Labels are unique so the list stays pickable. */
export async function createSizeOption(
  actor: Actor,
  input: { label?: unknown; ageLabel?: unknown },
): Promise<SizeOptionView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const label = typeof input.label === "string" ? input.label.trim() : "";
  const ageLabel = typeof input.ageLabel === "string" ? input.ageLabel.trim() : "";

  if (label.length < 1 || label.length > 20) {
    throw new ValidationError("The size must be between 1 and 20 characters.");
  }

  if (ageLabel.length < 1 || ageLabel.length > 40) {
    throw new ValidationError("The age must be between 1 and 40 characters.");
  }

  const existing = await prisma.sizeOption.findUnique({ where: { label } });

  if (existing) {
    throw new ConflictError(`The size "${label}" already exists.`);
  }

  const created = await prisma.sizeOption.create({ data: { label, ageLabel } });

  await prisma.auditLog.create({
    data: {
      accountId: actor.id,
      action: "SIZE_CREATED",
      entity: "SizeOption",
      entityId: created.id,
      newValue: `${created.label} (${created.ageLabel})`,
    },
  });

  return { id: created.id, label: created.label, ageLabel: created.ageLabel, usageCount: 0 };
}

/** Removes a size that no variant uses yet. */
export async function deleteSizeOption(actor: Actor, sizeId: string): Promise<{ label: string }> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const size = await prisma.sizeOption.findUnique({ where: { id: sizeId } });

  if (!size) {
    throw new NotFoundError("The size was not found.");
  }

  const used = await prisma.productVariant.count({ where: { size: size.label } });

  if (used > 0) {
    throw new ConflictError(`${used} variant(s) still use the size "${size.label}".`);
  }

  await prisma.$transaction([
    prisma.sizeOption.delete({ where: { id: size.id } }),
    prisma.auditLog.create({
      data: {
        accountId: actor.id,
        action: "SIZE_DELETED",
        entity: "SizeOption",
        entityId: size.id,
        newValue: size.label,
      },
    }),
  ]);

  return { label: size.label };
}
