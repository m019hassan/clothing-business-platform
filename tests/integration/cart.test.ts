import { beforeEach, describe, expect, it } from "vitest";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem, getCart, removeItem, updateItem } from "@/modules/cart/application/cart-service";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";

// Integration tests against the local development database (prisma dev).
// DATABASE_URL must be reachable (see tests/setup.ts loading .env).

type TestAccount = NonNullable<SafeAccount>;

let account: TestAccount;
let variantA: { id: string; sku: string };
let variantB: { id: string; sku: string };

async function seedFixtures() {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));

  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000);
  const accountRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-${suffix}@example.com`,
      phone: `+9667${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VIT-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Runner",
        },
      },
    },
    include: { customerProfile: true },
  });

  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));

  const product = await prisma.product.create({
    data: {
      name: `Vitest Product ${suffix}`,
      slug: `vitest-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("100.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: {
        create: [
          { sku: `VIT-A-${suffix}`, size: "M", color: "Red", status: "ACTIVE", priceOverride: new Prisma.Decimal("50.00") },
          { sku: `VIT-B-${suffix}`, size: "L", color: "Blue", status: "ACTIVE" },
        ],
      },
    },
    include: { variants: true },
  });

  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));

  const variantARecord = product.variants.find((v) => v.sku.startsWith("VIT-A"))!;
  const variantBRecord = product.variants.find((v) => v.sku.startsWith("VIT-B"))!;

  await prisma.inventoryItem.createMany({
    data: [
      { variantId: variantARecord.id, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
      { variantId: variantBRecord.id, warehouseId: warehouse.id, quantityOnHand: 2, quantityReserved: 0 },
    ],
  });

  return {
    accountRecord,
    variantA: { id: variantARecord.id, sku: variantARecord.sku },
    variantB: { id: variantBRecord.id, sku: variantBRecord.sku },
  };
}

beforeEach(async () => {
  const fixtures = await seedFixtures();
  account = {
    id: fixtures.accountRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: fixtures.accountRecord.email,
    phone: fixtures.accountRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: fixtures.accountRecord.createdAt,
    updatedAt: fixtures.accountRecord.updatedAt,
    customerProfile: { id: fixtures.accountRecord.customerProfile!.id },
  } as TestAccount;
  variantA = fixtures.variantA;
  variantB = fixtures.variantB;
});

describe("cart reservation", () => {
  it("adds items and keeps the reservation", async () => {
    const cart = await addItem(account, { variantId: variantA.id, quantity: 2 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].unitPrice).toBe("50");
    expect(cart.items[0].lineTotal).toBe("100");
    expect(cart.total).toBe("100");

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId: variantA.id } });
    expect(inventory?.quantityReserved).toBe(2);
    expect(inventory?.quantityOnHand).toBe(5);
  });

  it("merges duplicate adds into one line", async () => {
    await addItem(account, { variantId: variantA.id, quantity: 1 });
    const cart = await addItem(account, { variantId: variantA.id, quantity: 2 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId: variantA.id } });
    expect(inventory?.quantityReserved).toBe(3);
  });

  it("rejects quantities above availability with 409 semantics", async () => {
    await expect(addItem(account, { variantId: variantB.id, quantity: 5 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("increasing quantity reserves the difference only", async () => {
    await addItem(account, { variantId: variantA.id, quantity: 1 });
    const item = (await getCart(account)).items[0];

    await updateItem(account, item.id, { quantity: 3 });

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId: variantA.id } });
    expect(inventory?.quantityReserved).toBe(3);
  });

  it("releases the reservation when an item is removed", async () => {
    await addItem(account, { variantId: variantA.id, quantity: 2 });
    const item = (await getCart(account)).items[0];

    await removeItem(account, item.id);

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId: variantA.id } });
    expect(inventory?.quantityReserved).toBe(0);
  });

  it("never drives available negative", async () => {
    await addItem(account, { variantId: variantB.id, quantity: 2 });

    const inventory = await prisma.inventoryItem.findFirst({ where: { variantId: variantB.id } });
    expect(inventory!.quantityReserved).toBeLessThanOrEqual(inventory!.quantityOnHand);
    expect(inventory!.quantityReserved).toBeGreaterThanOrEqual(0);
  });

  it("returns an empty cart for a fresh customer", async () => {
    const cart = await getCart(account);
    expect(cart.id).toBeNull();
    expect(cart.items).toHaveLength(0);
  });
});

describe("cart validation", () => {
  it("rejects zero and negative quantities", async () => {
    await expect(addItem(account, { variantId: variantA.id, quantity: 0 })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(addItem(account, { variantId: variantA.id, quantity: -1 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects non-integer quantities", async () => {
    await expect(addItem(account, { variantId: variantA.id, quantity: 1.5 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects unknown variant ids", async () => {
    await expect(
      addItem(account, { variantId: "00000000-0000-0000-0000-000000000000", quantity: 1 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
