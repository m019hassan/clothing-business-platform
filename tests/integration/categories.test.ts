import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { hasPermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  createCategory,
  listCategories,
  parseCategoryWriteInput,
  updateCategory,
} from "@/modules/catalog/application/categories";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const account = { id: "00000000-0000-4000-8000-00000000cafe", accountType: "EMPLOYEE" } as TestAccount;

const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);
const createdIds: string[] = [];

afterAll(async () => {
  await prisma.product.deleteMany({ where: { categoryId: { in: createdIds } } });
  await prisma.category.deleteMany({ where: { id: { in: createdIds } } });
});

describe("parseCategoryWriteInput", () => {
  it("normalises a valid payload", () => {
    expect(
      parseCategoryWriteInput({ name: "  Summer  ", slug: "Summer-Wear", description: "  ", isActive: false }, { partial: false }),
    ).toEqual({ name: "Summer", slug: "summer-wear", description: null, isActive: false });
  });

  it("requires name and slug on create and rejects junk", () => {
    expect(() => parseCategoryWriteInput({ slug: "x" }, { partial: false })).toThrowError();
    expect(() => parseCategoryWriteInput({ name: "x" }, { partial: false })).toThrowError();
    expect(() => parseCategoryWriteInput({ name: "x", slug: "Bad Slug" }, { partial: false })).toThrowError();
    expect(() => parseCategoryWriteInput({ name: "x", slug: "ok", extra: 1 }, { partial: false })).toThrowError();
    expect(() => parseCategoryWriteInput({ isActive: "yes" }, { partial: true })).toThrowError();
  });

  it("rejects an empty update payload", () => {
    expect(() => parseCategoryWriteInput({}, { partial: true })).toThrowError();
  });
});

describe("category writes", () => {
  it("creates a category and reports zero products", async () => {
    const category = await createCategory(account, { name: `Vitest Cat ${suffix}`, slug: `vitest-cat-${suffix}` });
    createdIds.push(category.id);

    expect(category.slug).toBe(`vitest-cat-${suffix}`);
    expect(category.isActive).toBe(true);
    expect(category.productCount).toBe(0);

    await expect(
      createCategory(account, { name: "Duplicate", slug: `vitest-cat-${suffix}` }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("updates a category and hides it from the public list when deactivated", async () => {
    const category = await createCategory(account, { name: `Vitest Hidden ${suffix}`, slug: `vitest-hidden-${suffix}` });
    createdIds.push(category.id);

    const renamed = await updateCategory(account, category.id, { name: "Vitest Hidden Renamed" });
    expect(renamed.name).toBe("Vitest Hidden Renamed");

    const publicList = await listCategories();
    expect(publicList.some((entry) => entry.id === category.id)).toBe(true);

    await updateCategory(account, category.id, { isActive: false });

    const afterDeactivation = await listCategories();
    expect(afterDeactivation.some((entry) => entry.id === category.id)).toBe(false);

    const withInactive = await listCategories({ includeInactive: true });
    expect(withInactive.some((entry) => entry.id === category.id)).toBe(true);
  });

  it("rejects unknown ids, empty payloads and slug conflicts", async () => {
    await expect(
      updateCategory(account, "00000000-0000-4000-8000-000000000000", { name: "Ghost" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(updateCategory(account, "not-a-uuid", { name: "Ghost" })).rejects.toMatchObject({
      statusCode: 404,
    });

    const first = await createCategory(account, { name: `Vitest A ${suffix}`, slug: `vitest-a-${suffix}` });
    const second = await createCategory(account, { name: `Vitest B ${suffix}`, slug: `vitest-b-${suffix}` });
    createdIds.push(first.id, second.id);

    await expect(updateCategory(account, second.id, {})).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      updateCategory(account, second.id, { slug: `vitest-a-${suffix}` }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("refuses includeInactive without catalog access", async () => {
    vi.mocked(hasPermission).mockResolvedValueOnce(false);

    await expect(listCategories({ includeInactive: true })).rejects.toMatchObject({ statusCode: 403 });
  });
});
