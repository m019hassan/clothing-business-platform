import "server-only";

import { Prisma } from "@prisma/client";

import { hasPermission, requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { CategoryView } from "@/modules/catalog/types";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_NAME = 100;
const MAX_SLUG = 100;
const MAX_DESCRIPTION = 5000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categorySelection = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

type CategoryRecord = Prisma.CategoryGetPayload<{ select: typeof categorySelection }>;

export type CategoryWriteInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
};

export function mapCategory(record: CategoryRecord): CategoryView {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    isActive: record.isActive,
    productCount: record._count.products,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("name is required.");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("name is required.");
  }

  if (trimmed.length > MAX_NAME) {
    throw new ValidationError(`name must be at most ${MAX_NAME} characters.`);
  }

  return trimmed;
}

function parseSlug(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("slug is required.");
  }

  const slug = value.trim().toLowerCase();

  if (slug.length === 0 || slug.length > MAX_SLUG) {
    throw new ValidationError(`slug must be between 1 and ${MAX_SLUG} characters.`);
  }

  if (!SLUG_PATTERN.test(slug)) {
    throw new ValidationError("slug must use lowercase letters, digits and single hyphens.");
  }

  return slug;
}

function parseDescription(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError("description must be a string or null.");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_DESCRIPTION) {
    throw new ValidationError(`description must be at most ${MAX_DESCRIPTION} characters.`);
  }

  return trimmed;
}

/** Validates a category create/update payload. Unknown keys are rejected. */
export function parseCategoryWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): CategoryWriteInput {
  const body = asRecord(payload);
  const allowed = ["name", "slug", "description", "isActive"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: CategoryWriteInput = {};

  if (body.name !== undefined) {
    input.name = parseName(body.name);
  } else if (!partial) {
    throw new ValidationError("name is required.");
  }

  if (body.slug !== undefined) {
    input.slug = parseSlug(body.slug);
  } else if (!partial) {
    throw new ValidationError("slug is required.");
  }

  if (body.description !== undefined) {
    input.description = parseDescription(body.description);
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw new ValidationError("isActive must be a boolean.");
    }

    input.isActive = body.isActive;
  }

  if (partial && Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

/**
 * Public listing: active categories only. Staff with products.view may request
 * the inactive ones as well (they are needed to reactivate a category).
 */
export async function listCategories(
  options: { includeInactive?: boolean } = {},
): Promise<CategoryView[]> {
  if (options.includeInactive === true && !(await hasPermission(PERMISSIONS.PRODUCTS_VIEW))) {
    throw new AuthorizationError("Catalog access is required to list inactive categories.");
  }

  const categories = await withDatabaseError(() =>
    prisma.category.findMany({
      where: options.includeInactive === true ? {} : { isActive: true },
      select: categorySelection,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
  );

  return categories.map(mapCategory);
}

export async function createCategory(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<CategoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_CREATE);
  const input = parseCategoryWriteInput(payload, { partial: false });

  const category = await withDatabaseError(async () => {
    try {
      return await prisma.category.create({
        data: {
          name: input.name!,
          slug: input.slug!,
          description: input.description ?? null,
          isActive: input.isActive ?? true,
        },
        select: categorySelection,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A category with this slug already exists.");
      }

      throw error;
    }
  });

  return mapCategory(category);
}

export async function updateCategory(
  account: AuthenticatedAccount,
  categoryId: string,
  payload: unknown,
): Promise<CategoryView> {
  await requirePermission(PERMISSIONS.PRODUCTS_UPDATE);

  if (!isUuid(categoryId)) {
    throw new NotFoundError("Category not found.");
  }

  const input = parseCategoryWriteInput(payload, { partial: true });

  const existing = await withDatabaseError(() =>
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
  );

  if (!existing) {
    throw new NotFoundError("Category not found.");
  }

  const data: Prisma.CategoryUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const category = await withDatabaseError(async () => {
    try {
      return await prisma.category.update({ where: { id: categoryId }, data, select: categorySelection });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("A category with this slug already exists.");
      }

      throw error;
    }
  });

  return mapCategory(category);
}
