import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { requirePermission } from "@/modules/auth/application/authorization";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  addProductImage,
  deleteProductImage,
  listProductImages,
  readProductImage,
} from "@/modules/catalog/application/product-images";
import { AuthorizationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let staff: TestAccount;
let productId: string;
let variantId: string;
const created = { accountIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };

const PNG = Buffer.from("89504e470d0a1a0a", "hex");

beforeEach(async () => {
  process.env.UPLOAD_DIR = await mkdtemp(join(tmpdir(), "cbp-images-"));
  vi.mocked(requirePermission).mockResolvedValue(undefined);

  const department =
    (await prisma.department.findFirst({ where: { code: "OPS" } })) ??
    (await prisma.department.create({ data: { code: "OPS", name: "Operations" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const staffRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-images-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      employeeProfile: {
        create: {
          employeeNumber: `VITIMG-${suffix.toUpperCase()}`,
          departmentId: department.id,
          firstName: "Vitest",
          lastName: "Images",
        },
      },
    },
    include: { employeeProfile: true },
  });
  const product = await prisma.product.create({
    data: {
      name: `Vitest Images ${suffix}`,
      slug: `vitest-images-${suffix}`,
      status: "ACTIVE",
      basePrice: "120.00",
      currency: "SAR",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `VITIMG-A-${suffix}`, size: "10", color: "أحمر", status: "ACTIVE" },
          { sku: `VITIMG-B-${suffix}`, size: "12", color: "أزرق", status: "ACTIVE" },
        ],
      },
    },
    include: { variants: true },
  });

  created.accountIds.push(staffRecord.id);
  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));
  productId = product.id;
  variantId = product.variants[0].id;

  staff = {
    id: staffRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: staffRecord.email,
    phone: staffRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: staffRecord.createdAt,
    updatedAt: staffRecord.updatedAt,
    employeeProfile: { id: staffRecord.employeeProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  await prisma.productImage.deleteMany({ where: { productId: { in: created.productIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.employeeProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  delete process.env.UPLOAD_DIR;
});

describe("product photos", () => {
  it("stores a photo for a colour and reads it back", async () => {
    const image = await addProductImage(
      staff,
      productId,
      { data: PNG, contentType: "image/png", originalName: "أحمر.png" },
      variantId,
    );

    expect(image.variantId).toBe(variantId);
    expect(image.originalName).toBe("أحمر.png");

    const read = await readProductImage(image.id);
    expect(read.mimeType).toBe("image/png");
    expect(read.data.equals(PNG)).toBe(true);

    const audit = await prisma.auditLog.findFirst({ where: { accountId: staff.id, action: "PRODUCT_IMAGE_ADDED" } });
    expect(audit?.entityId).toBe(productId);
  });

  it("lists the photos oldest first and removes one", async () => {
    const first = await addProductImage(staff, productId, {
      data: PNG,
      contentType: "image/png",
      originalName: "1.png",
    });
    const second = await addProductImage(staff, productId, {
      data: PNG,
      contentType: "image/jpeg",
      originalName: "2.jpg",
    });

    const images = await listProductImages(productId);
    expect(images.map((image) => image.id)).toEqual([first.id, second.id]);
    expect(images[1].variantId).toBeNull();

    await deleteProductImage(staff, first.id);
    expect((await listProductImages(productId)).map((image) => image.id)).toEqual([second.id]);
  });

  it("reports every photo id on the product list for the slider", async () => {
    const first = await addProductImage(staff, productId, { data: PNG, contentType: "image/png", originalName: "a.png" });
    const second = await addProductImage(staff, productId, { data: PNG, contentType: "image/jpeg", originalName: "b.jpg" });

    const { listProducts } = await import("@/modules/catalog/application/products");
    const rows = await listProducts({ limit: 50, offset: 0 }, { search: "Vitest Images" });
    const row = rows.find((entry) => entry.id === productId);

    expect(row?.imageId).toBe(first.id);
    expect(row?.imageIds).toEqual([first.id, second.id]);

    // the catalogue also carries the colour swatch for the card
    const { prisma: db } = await import("@/src/lib/db");
    await db.productVariant.updateMany({ where: { productId }, data: { color: "أحمر" } });
    const after = (await listProducts({ limit: 50, offset: 0 }, { search: "Vitest Images" })).find(
      (entry) => entry.id === productId,
    );
    expect(after?.variants[0].colorHex).toBe("#DC2626");
    expect(after?.variants[0].colorNameEn).toBe("Red");
  });

  it("refuses a file that is not an image", async () => {
    await expect(
      addProductImage(staff, productId, { data: PNG, contentType: "application/pdf", originalName: "x.pdf" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("refuses a variant that belongs to another product", async () => {
    const other = await prisma.product.create({
      data: {
        name: "Vitest Other",
        slug: `vitest-other-${Date.now().toString(36)}`,
        status: "ACTIVE",
        basePrice: "10.00",
        currency: "SAR",
        categoryId: (await prisma.category.findFirstOrThrow({ where: { slug: "vitest" } })).id,
        variants: { create: [{ sku: `VITIMG-O-${Date.now().toString(36)}`, status: "ACTIVE" }] },
      },
      include: { variants: true },
    });
    created.productIds.push(other.id);
    created.variantIds.push(other.variants[0].id);

    await expect(
      addProductImage(staff, productId, { data: PNG, contentType: "image/png", originalName: "x.png" }, other.variants[0].id),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("stops before writing anything when the permission is missing", async () => {
    vi.mocked(requirePermission).mockRejectedValueOnce(new AuthorizationError("Missing products.update."));

    await expect(
      addProductImage(staff, productId, { data: PNG, contentType: "image/png", originalName: "x.png" }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.productImage.count({ where: { productId } })).toBe(0);
    expect(vi.mocked(requirePermission)).toHaveBeenCalledWith("products.update");
  });
});
