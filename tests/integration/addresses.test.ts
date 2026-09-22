import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  parseAddressWriteInput,
  resolveDeliveryAddress,
  updateAddress,
} from "@/modules/customers/application/addresses";
import { createOrderFromCart } from "@/modules/order/application/orders";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let customer: TestAccount;
let otherCustomer: TestAccount;
const created = { accountIds: [] as string[], profileIds: [] as string[], productIds: [] as string[], variantIds: [] as string[] };
let variantId: string;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    label: "Home",
    recipientName: "Ahmed Ali",
    phone: "+966512345678",
    line1: "123 King Fahd Rd",
    line2: "Apt 4",
    city: "Jeddah",
    region: "Makkah",
    postalCode: "21577",
    country: "sa",
    ...overrides,
  };
}

function toAccount(record: { id: string; email: string | null; phone: string; createdAt: Date; updatedAt: Date; customerProfileId: string }) {
  return {
    id: record.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: record.email,
    phone: record.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    customerProfile: { id: record.customerProfileId },
  } as TestAccount;
}

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const warehouse =
    (await prisma.warehouse.findFirst({ where: { code: "MAIN" } })) ??
    (await prisma.warehouse.create({ data: { name: "Main Store", code: "MAIN" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const createCustomer = async (label: string) => {
    const record = await prisma.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email: `vitest-addr-${label}-${suffix}@example.com`,
        phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
        passwordHash: "test-hash",
        customerProfile: {
          create: {
            customerCode: `VITADDR-${label.toUpperCase()}-${suffix.toUpperCase()}`,
            classificationId: classification.id,
            firstName: "Vitest",
            lastName: label,
          },
        },
      },
      include: { customerProfile: true },
    });

    created.accountIds.push(record.id);
    created.profileIds.push(record.customerProfile!.id);

    return toAccount({
      id: record.id,
      email: record.email,
      phone: record.phone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      customerProfileId: record.customerProfile!.id,
    });
  };

  customer = await createCustomer("a");
  otherCustomer = await createCustomer("b");

  const product = await prisma.product.create({
    data: {
      name: `Vitest Address ${suffix}`,
      slug: `vitest-addr-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("30.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `VITADDR-${suffix}`, size: "M", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });
  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 10, quantityReserved: 0 },
  });

  created.productIds.push(product.id);
  created.variantIds.push(product.variants[0].id);
  variantId = product.variants[0].id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { orderId: { in: (await prisma.order.findMany({ where: { customerProfileId: { in: created.profileIds } }, select: { id: true } })).map(o => o.id) } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: (await prisma.order.findMany({ where: { customerProfileId: { in: created.profileIds } }, select: { id: true } })).map(o => o.id) } } });
  await prisma.order.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.notification.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.address.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cartItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.cart.deleteMany({ where: { customerProfileId: { in: created.profileIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
});

describe("parseAddressWriteInput", () => {
  it("normalises the payload (country uppercase, optional fields nulled)", () => {
    const input = parseAddressWriteInput(payload({ label: "  Home ", country: "sa", region: "  " }), { partial: false });

    expect(input).toMatchObject({ label: "Home", country: "SA", region: null, city: "Jeddah" });
  });

  it("requires the mandatory fields on create and rejects junk", () => {
    for (const field of ["recipientName", "phone", "line1", "city"]) {
      const body: Record<string, unknown> = payload();
      delete body[field];
      expect(() => parseAddressWriteInput(body, { partial: false })).toThrowError();
    }

    expect(() => parseAddressWriteInput(payload({ country: "SAUDI" }), { partial: false })).toThrowError();
    expect(() => parseAddressWriteInput(payload({ isDefault: "yes" }), { partial: false })).toThrowError();
    expect(() => parseAddressWriteInput(payload({ extra: 1 }), { partial: false })).toThrowError();
    expect(() => parseAddressWriteInput({}, { partial: true })).toThrowError();
  });
});

describe("address lifecycle", () => {
  it("creates addresses and makes the first one the default", async () => {
    const first = await createAddress(customer, payload());
    expect(first.isDefault).toBe(true);

    const second = await createAddress(customer, payload({ label: "Office", city: "Riyadh", isDefault: true }));
    expect(second.isDefault).toBe(true);

    const list = await listAddresses(customer);
    expect(list).toHaveLength(2);
    expect(list.find((address) => address.id === first.id)?.isDefault).toBe(false);
    expect(list[0].id).toBe(second.id);
  });

  it("keeps addresses scoped to their owner (404 on foreign ids)", async () => {
    const address = await createAddress(customer, payload());

    await expect(listAddresses(otherCustomer)).resolves.toHaveLength(0);
    await expect(updateAddress(otherCustomer, address.id, { city: "Tabuk" })).rejects.toMatchObject({ statusCode: 404 });
    await expect(deleteAddress(otherCustomer, address.id)).rejects.toMatchObject({ statusCode: 404 });
    await expect(resolveDeliveryAddress(otherCustomer, address.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates fields and moves the default flag", async () => {
    const first = await createAddress(customer, payload());
    const second = await createAddress(customer, payload({ label: "Office", city: "Riyadh" }));

    const updated = await updateAddress(customer, second.id, { isDefault: true, region: "Central" });
    expect(updated.isDefault).toBe(true);
    expect(updated.region).toBe("Central");

    const list = await listAddresses(customer);
    expect(list.find((address) => address.id === first.id)?.isDefault).toBe(false);
  });

  it("soft-deletes an address and hides it from the list", async () => {
    const address = await createAddress(customer, payload());
    const result = await deleteAddress(customer, address.id);

    expect(result.wasDefault).toBe(true);
    expect(await listAddresses(customer)).toHaveLength(0);

    const row = await prisma.address.findUniqueOrThrow({ where: { id: address.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.isDefault).toBe(false);
  });
});

describe("order delivery address", () => {
  it("links an owned address to the order and stores an immutable snapshot", async () => {
    const address = await createAddress(customer, payload());

    await addItem(customer, { variantId, quantity: 2 });
    const order = await createOrderFromCart(customer, { addressId: address.id });

    expect(order.addressId).toBe(address.id);
    expect(order.deliveryAddress).toMatchObject({
      recipientName: "Ahmed Ali",
      city: "Jeddah",
      country: "SA",
      line1: "123 King Fahd Rd",
    });

    // Editing the address afterwards must not rewrite the order's snapshot.
    await updateAddress(customer, address.id, { city: "Dammam" });

    const reread = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { deliveryAddress: true },
    });
    expect((reread.deliveryAddress as Record<string, unknown>).city).toBe("Jeddah");

    // And a deleted address keeps the snapshot intact on the order.
    await deleteAddress(customer, address.id);
    const afterDelete = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { deliveryAddress: true, addressId: true },
    });
    expect(afterDelete.addressId).toBe(address.id);
    expect((afterDelete.deliveryAddress as Record<string, unknown>).city).toBe("Jeddah");
  });

  it("rejects a foreign address and still creates orders without one", async () => {
    const foreign = await createAddress(otherCustomer, payload());

    await expect(createOrderFromCart(customer, { addressId: foreign.id })).rejects.toMatchObject({ statusCode: 404 });

    await addItem(customer, { variantId, quantity: 1 });
    const bare = await createOrderFromCart(customer);
    expect(bare.addressId).toBeNull();
    expect(bare.deliveryAddress).toBeNull();
  });
});
