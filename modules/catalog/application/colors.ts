import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type Actor = NonNullable<SafeAccount>;

export type ColorOptionView = {
  id: string;
  name: string;
  nameEn: string | null;
  hex: string;
  /** How many variants already use this colour name. */
  usageCount: number;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function mapColor(color: {
  id: string;
  name: string;
  nameEn?: string | null;
  hex: string;
  usageCount?: number;
}): ColorOptionView {
  return {
    id: color.id,
    name: color.name,
    nameEn: color.nameEn ?? null,
    hex: color.hex,
    usageCount: color.usageCount ?? 0,
  };
}

/** Every colour of the shared library, with how many variants already use it. */
export async function listColorOptions(): Promise<ColorOptionView[]> {
  await requirePermission(PERMISSIONS.PRODUCTS_VIEW);

  const colors = await prisma.colorOption.findMany({ orderBy: { createdAt: "asc" } });
  const usage = await prisma.productVariant.groupBy({
    by: ["color"],
    where: { color: { not: null } },
    _count: { _all: true },
  });
  const usageByName = new Map(usage.map((entry) => [entry.color ?? "", entry._count._all]));

  return colors.map((color) => mapColor({ ...color, usageCount: usageByName.get(color.name) ?? 0 }));
}

/** Adds a colour to the library. Names are unique so the list stays pickable. */
export async function createColorOption(
  actor: Actor,
  input: { name?: unknown; hex?: unknown; nameEn?: unknown },
): Promise<ColorOptionView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const hex = typeof input.hex === "string" ? input.hex.trim().toUpperCase() : "";
  const nameEnRaw = typeof input.nameEn === "string" ? input.nameEn.trim() : "";

  if (nameEnRaw.length > 40) {
    throw new ValidationError("The English colour name must be at most 40 characters.");
  }

  const nameEn = nameEnRaw === "" ? null : nameEnRaw;

  if (name.length < 2 || name.length > 40) {
    throw new ValidationError("The colour name must be between 2 and 40 characters.");
  }

  if (!HEX_PATTERN.test(hex)) {
    throw new ValidationError("The colour code must look like #RRGGBB.");
  }

  const existing = await prisma.colorOption.findUnique({ where: { name } });

  if (existing) {
    throw new ConflictError(`The colour "${name}" already exists.`);
  }

  const created = await prisma.colorOption.create({ data: { name, nameEn, hex } });

  await prisma.auditLog.create({
    data: {
      accountId: actor.id,
      action: "COLOR_CREATED",
      entity: "ColorOption",
      entityId: created.id,
      newValue: created.name,
    },
  });

  return mapColor(created);
}

/** Removes a colour that no variant uses yet. */
export async function deleteColorOption(actor: Actor, colorId: string): Promise<{ name: string }> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const color = await prisma.colorOption.findUnique({ where: { id: colorId } });

  if (!color) {
    throw new NotFoundError("The colour was not found.");
  }

  const used = await prisma.productVariant.count({ where: { color: color.name } });

  if (used > 0) {
    throw new ConflictError(`${used} variant(s) still use the colour "${color.name}".`);
  }

  await prisma.$transaction([
    prisma.colorOption.delete({ where: { id: color.id } }),
    prisma.auditLog.create({
      data: {
        accountId: actor.id,
        action: "COLOR_DELETED",
        entity: "ColorOption",
        entityId: color.id,
        newValue: color.name,
      },
    }),
  ]);

  return { name: color.name };
}

/** Edits a colour: its names or its code. */
export async function updateColorOption(
  actor: Actor,
  colorId: string,
  input: { name?: unknown; nameEn?: unknown; hex?: unknown },
): Promise<ColorOptionView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const color = await prisma.colorOption.findUnique({ where: { id: colorId } });

  if (!color) {
    throw new NotFoundError("The colour was not found.");
  }

  const data: { name?: string; nameEn?: string | null; hex?: string } = {};

  if (input.name !== undefined) {
    const name = typeof input.name === "string" ? input.name.trim() : "";

    if (name.length < 2 || name.length > 40) {
      throw new ValidationError("The colour name must be between 2 and 40 characters.");
    }

    if (name !== color.name) {
      const clash = await prisma.colorOption.findUnique({ where: { name } });

      if (clash) {
        throw new ConflictError(`The colour "${name}" already exists.`);
      }
    }

    data.name = name;
  }

  if (input.nameEn !== undefined) {
    const nameEnRaw = typeof input.nameEn === "string" ? input.nameEn.trim() : "";

    if (nameEnRaw.length > 40) {
      throw new ValidationError("The English colour name must be at most 40 characters.");
    }

    data.nameEn = nameEnRaw === "" ? null : nameEnRaw;
  }

  if (input.hex !== undefined) {
    const hex = typeof input.hex === "string" ? input.hex.trim().toUpperCase() : "";

    if (!HEX_PATTERN.test(hex)) {
      throw new ValidationError("The colour code must look like #RRGGBB.");
    }

    data.hex = hex;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("Nothing to update.");
  }

  const updated = await prisma.colorOption.update({ where: { id: color.id }, data });

  await prisma.auditLog.create({
    data: {
      accountId: actor.id,
      action: "COLOR_UPDATED",
      entity: "ColorOption",
      entityId: color.id,
      oldValue: `${color.name} / ${color.hex}`,
      newValue: `${updated.name} / ${updated.hex}`,
    },
  });

  return mapColor(updated);
}
