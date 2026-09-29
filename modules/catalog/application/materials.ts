import "server-only";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type Actor = NonNullable<SafeAccount>;

export type MaterialOptionView = {
  id: string;
  name: string;
  /** How many products already use this material. */
  usageCount: number;
};

/** Every material of the shared library, with how many products use it. */
export async function listMaterialOptions(): Promise<MaterialOptionView[]> {
  await requirePermission(PERMISSIONS.PRODUCTS_VIEW);

  const materials = await prisma.materialOption.findMany({ orderBy: { createdAt: "asc" } });
  const usage = await prisma.product.groupBy({
    by: ["material"],
    where: { material: { not: null } },
    _count: { _all: true },
  });
  const usageByName = new Map(usage.map((entry) => [entry.material ?? "", entry._count._all]));

  return materials.map((material) => ({
    id: material.id,
    name: material.name,
    usageCount: usageByName.get(material.name) ?? 0,
  }));
}

/** Adds a material to the library. Names are unique so the list stays pickable. */
export async function createMaterialOption(
  actor: Actor,
  input: { name?: unknown },
): Promise<MaterialOptionView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const name = typeof input.name === "string" ? input.name.trim() : "";

  if (name.length < 2 || name.length > 40) {
    throw new ValidationError("The material name must be between 2 and 40 characters.");
  }

  const existing = await prisma.materialOption.findUnique({ where: { name } });

  if (existing) {
    throw new ConflictError(`The material "${name}" already exists.`);
  }

  const created = await prisma.materialOption.create({ data: { name } });

  await prisma.auditLog.create({
    data: {
      accountId: actor.id,
      action: "MATERIAL_CREATED",
      entity: "MaterialOption",
      entityId: created.id,
      newValue: created.name,
    },
  });

  return { id: created.id, name: created.name, usageCount: 0 };
}

/** Removes a material that no product uses yet. */
export async function deleteMaterialOption(actor: Actor, materialId: string): Promise<{ name: string }> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);

  const material = await prisma.materialOption.findUnique({ where: { id: materialId } });

  if (!material) {
    throw new NotFoundError("The material was not found.");
  }

  const used = await prisma.product.count({ where: { material: material.name } });

  if (used > 0) {
    throw new ConflictError(`${used} product(s) still use the material "${material.name}".`);
  }

  await prisma.$transaction([
    prisma.materialOption.delete({ where: { id: material.id } }),
    prisma.auditLog.create({
      data: {
        accountId: actor.id,
        action: "MATERIAL_DELETED",
        entity: "MaterialOption",
        entityId: material.id,
        newValue: material.name,
      },
    }),
  ]);

  return { name: material.name };
}
