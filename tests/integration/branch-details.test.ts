import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { getBranchDetails } from "@/modules/branches/application/branch-details";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let admin: TestAccount;
let branchId: string;
let otherBranchId: string;
const created = {
  accountIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  orderIds: [] as string[],
  profileIds: [] as string[],
};

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `BD-${suffix.toUpperCase()}`, name: `Branch Details ${suffix}`, city: "Riyadh" },
  });
  const other = await prisma.branch.create({
    data: { code: `BD2-${suffix.toUpperCase()}`, name: `Other ${suffix}` },
  });
  created.branchIds.push(branch.id, other.id);
  branchId = branch.id;
  otherBranchId = other.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `BDW-${suffix.toUpperCase()}`, name: `BD Warehouse ${suffix}`, branchId: branch.id },
  });
  created.warehouseIds.push(warehouse.id);

  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const product = await prisma.product.create({
    data: {
      name: `Branch Product ${suffix}`,
      slug: `branch-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("50.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `BD-SKU-${suffix.toUpperCase()}`, size: "5", status: "ACTIVE" }] },
    },
    include: { variants: true },
  });

  await prisma.inventoryItem.create({
    data: { variantId: product.variants[0].id, warehouseId: warehouse.id, quantityOnHand: 12, quantityReserved: 2 },
  });

  const customerAccount = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-bd-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `BDC-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Customer",
        },
      },
    },
    include: { customerProfile: true },
  });
  created.accountIds.push(customerAccount.id);
  created.profileIds.push(customerAccount.customerProfile!.id);

  const order = await prisma.order.create({
    data: {
      orderNumber: `BD-ORD-${suffix.toUpperCase()}`,
      customerProfileId: customerAccount.customerProfile!.id,
      status: "CONFIRMED",
      channel: "POS",
      branchId: branch.id,
      subtotalAmount: new Prisma.Decimal("100.00"),
      totalAmount: new Prisma.Decimal("100.00"),
      currency: "SAR",
      items: {
        create: [
          { variantId: product.variants[0].id, quantity: 2, unitPrice: new Prisma.Decimal("50.00"), discountAmount: new Prisma.Decimal(0) },
        ],
      },
    },
  });
  created.orderIds.push(order.id);

  const adminRecord = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email: `vitest-bd-admin-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
    },
  });
  created.accountIds.push(adminRecord.id);

  admin = {
    id: adminRecord.id,
    accountType: "EMPLOYEE",
    status: "ACTIVE",
    email: adminRecord.email,
    phone: adminRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: adminRecord.createdAt,
    updatedAt: adminRecord.updatedAt,
    employeeProfile: null,
  } as unknown as TestAccount;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({ where: { orderId: { in: created.orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
  await prisma.inventoryItem.deleteMany({ where: { warehouseId: { in: created.warehouseIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

describe("getBranchDetails", () => {
  it("gathers the branch stock, sales, staff and activity", async () => {
    const details = await getBranchDetails(admin, branchId);

    expect(details.code).toContain("BD-");
    expect(details.city).toBe("Riyadh");
    expect(details.warehouses).toHaveLength(1);
    expect(details.warehouses[0].onHand).toBe(12);
    expect(details.warehouses[0].available).toBe(10);
    expect(details.stock).toMatchObject({ onHand: 12, available: 10 });

    expect(details.sales.today.orders).toBe(1);
    expect(details.sales.today.items).toBe(2);
    expect(details.sales.today.total).toBe("100");
    expect(details.sales.month.orders).toBe(1);

    expect(details.staff.customers).toBe(1);
    expect(details.recentSales[0].orderNumber).toContain("BD-ORD-");
  });

  it("refuses a branch the scoped employee does not belong to", async () => {
    const scoped = { ...admin, employeeProfile: { id: "00000000-0000-4000-8000-000000000001", branchId } } as TestAccount;

    await expect(getBranchDetails(scoped, otherBranchId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(getBranchDetails(scoped, branchId)).resolves.toBeTruthy();
  });
});
