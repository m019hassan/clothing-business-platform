import { execFileSync } from "node:child_process";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, "scripts", "expire-reservations.mjs");

let staleCart: { id: string; variantId: string; inventoryItemId: string; onHand: number };
let freshCart: { id: string; variantId: string; inventoryItemId: string };
const created = {
  productIds: [] as string[],
  variantIds: [] as string[],
  accountIds: [] as string[],
  profileIds: [] as string[],
};

function runScript(args: string[]): {
  expiredCarts: number;
  releasedQuantity: number;
  mode: string;
  warnings: string[];
} {
  const output = execFileSync("node", [scriptPath, ...args, "--json"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  return JSON.parse(output);
}

async function seedCartWithReservation(label: string, quantity: number) {
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const suffix = `${Date.now().toString(36)}-${label}`;

  const product = await prisma.product.create({
    data: {
      name: `Vitest Expiry ${suffix}`,
      slug: `vitest-expiry-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("25.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITEXP-${suffix}`.toUpperCase(), size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });

  const inventoryItem = await prisma.inventoryItem.create({
    data: {
      variantId: product.variants[0].id,
      warehouseId: warehouse.id,
      quantityOnHand: 10,
      quantityReserved: 0,
    },
  });

  const accountRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-expiry-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITEXP-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: label,
        },
      },
    },
    include: { customerProfile: true },
  });

  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  created.accountIds.push(accountRecord.id);
  created.profileIds.push(accountRecord.customerProfile!.id);

  const account = {
    id: accountRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: accountRecord.email,
    phone: accountRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: accountRecord.createdAt,
    updatedAt: accountRecord.updatedAt,
    customerProfile: { id: accountRecord.customerProfile!.id },
  } as TestAccount;

  const cart = await addItem(account, { variantId: product.variants[0].id, quantity });

  return {
    cartId: cart.id!,
    variantId: product.variants[0].id,
    inventoryItemId: inventoryItem.id,
  };
}

beforeAll(async () => {
  const stale = await seedCartWithReservation("stale", 3);
  const fresh = await seedCartWithReservation("fresh", 2);

  // Backdate the stale cart (and its reservation) beyond any reasonable window.
  const old = new Date(Date.now() - 72 * 3600_000);
  await prisma.cart.update({ where: { id: stale.cartId }, data: { updatedAt: old } });

  staleCart = { id: stale.cartId, variantId: stale.variantId, inventoryItemId: stale.inventoryItemId, onHand: 10 };
  freshCart = { id: fresh.cartId, variantId: fresh.variantId, inventoryItemId: fresh.inventoryItemId };
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cartItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cart.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("expire-reservations script", () => {
  it("reports the abandoned carts in dry-run mode without touching anything", async () => {
    const summary = runScript(["--older-than-hours", "24", "--dry-run"]);

    expect(summary.mode).toBe("dry-run");
    expect(summary.expiredCarts).toBeGreaterThanOrEqual(1);
    expect(summary.releasedQuantity).toBe(0);

    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: staleCart.id } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: staleCart.inventoryItemId } });

    expect(cart.status).toBe("ACTIVE");
    expect(inventory.quantityReserved).toBe(3);
  });

  it("releases the reservation, abandons the cart and writes the ledger", async () => {
    const summary = runScript(["--older-than-hours", "1"]);

    expect(summary.mode).toBe("apply");
    expect(summary.releasedQuantity).toBeGreaterThanOrEqual(3);

    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: staleCart.id } });
    expect(cart.status).toBe("ABANDONED");

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: staleCart.inventoryItemId } });
    expect(inventory.quantityReserved).toBe(0);
    expect(inventory.quantityOnHand).toBe(10);

    const movements = await prisma.stockMovement.findMany({
      where: { variantId: staleCart.variantId, type: "RELEASE" },
      select: { quantityChange: true, quantityReservedAfter: true, reason: true, actorAccountId: true },
    });

    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      quantityChange: 0,
      quantityReservedAfter: 0,
      actorAccountId: null,
    });
    expect(movements[0].reason).toContain("expired");
  });

  it("leaves recent carts and their reservations alone", async () => {
    runScript(["--older-than-hours", "1"]);

    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: freshCart.id } });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: freshCart.inventoryItemId } });

    expect(cart.status).toBe("ACTIVE");
    expect(inventory.quantityReserved).toBe(2);
    expect(inventory.quantityOnHand).toBe(10);
  });

  it("is idempotent once the stale carts are gone", async () => {
    const first = runScript(["--older-than-hours", "1"]);
    const second = runScript(["--older-than-hours", "1"]);

    expect(first.releasedQuantity).toBeGreaterThanOrEqual(0);
    expect(second.releasedQuantity).toBe(0);
    expect(second.warnings).toEqual([]);
  });
});
