import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import {
  advancePosSwap,
  listOrderSwaps,
  parseSwapInput,
  parseSwapStage,
  requestPosSwap,
} from "@/modules/pos/application/pos-swaps";
import { exportPosSalesCsv } from "@/modules/pos/application/pos-export";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let distributor: TestAccount;
let branchId: string;
let warehouseId: string;
let variantA: string;
let orderItemId: string;
let orderId: string;

const created = {
  accountIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
  branchIds: [] as string[],
  warehouseIds: [] as string[],
  profileIds: [] as string[],
  orderIds: [] as string[],
};

const csvLabels = {
  invoice: "Invoice",
  date: "Date",
  status: "Status",
  statusSold: "Completed",
  statusPartial: "Partially returned",
  statusReturned: "Returned",
  payment: "Payment",
  unitsSold: "Units sold",
  unitsReturned: "Units returned",
  total: "Total",
  refunded: "Refunded",
  net: "Net",
  currency: "Currency",
  sku: "SKU",
  product: "Product",
  size: "Size",
  color: "Colour",
  quantity: "Qty",
  returned: "Returned",
  unitPrice: "Unit price",
  lineTotal: "Line total",
};

beforeEach(async () => {
  const classification =
    (await prisma.customerClassification.findFirst({ where: { code: "RETAIL" } })) ??
    (await prisma.customerClassification.create({ data: { code: "RETAIL", name: "Retail" } }));
  const category =
    (await prisma.category.findFirst({ where: { slug: "vitest" } })) ??
    (await prisma.category.create({ data: { name: "Vitest", slug: "vitest" } }));
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 100000);

  const branch = await prisma.branch.create({
    data: { code: `SWPB-${suffix.toUpperCase()}`, name: `Swap Branch ${suffix}` },
    select: { id: true },
  });
  created.branchIds.push(branch.id);
  branchId = branch.id;

  const warehouse = await prisma.warehouse.create({
    data: { code: `SWPW-${suffix.toUpperCase()}`, name: `Swap Warehouse ${suffix}`, branchId: branch.id },
    select: { id: true },
  });
  created.warehouseIds.push(warehouse.id);
  warehouseId = warehouse.id;

  const product = await prisma.product.create({
    data: {
      name: `Swap Product ${suffix}`,
      slug: `swap-product-${suffix}`,
      status: "ACTIVE",
      basePrice: new Prisma.Decimal("40.00"),
      currency: "SAR",
      categoryId: category.id,
      variants: {
        create: [{ sku: `SWP-A-${suffix}`, size: "M", status: "ACTIVE" }],
      },
    },
    include: { variants: true },
  });
  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));
  variantA = product.variants[0].id;

  await prisma.inventoryItem.create({
    data: { variantId: variantA, warehouseId: warehouse.id, quantityOnHand: 5, quantityReserved: 0 },
  });

  const distributorAccount = await prisma.account.create({
    data: {
      accountType: "DISTRIBUTOR",
      status: "ACTIVE",
      email: `vitest-swap-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      distributorProfile: {
        create: {
          distributorCode: `SD-${suffix.toUpperCase()}`,
          branchId: branch.id,
          firstName: "Vitest",
          lastName: "Distributor",
        },
      },
    },
    include: { distributorProfile: true },
  });

  const customerAccount = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-swap-c-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `SWPC-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Buyer",
        },
      },
    },
    include: { customerProfile: true },
  });

  created.accountIds.push(distributorAccount.id, customerAccount.id);
  created.profileIds.push(customerAccount.customerProfile!.id);

  distributor = {
    id: distributorAccount.id,
    accountType: "DISTRIBUTOR",
    status: "ACTIVE",
    email: distributorAccount.email,
    phone: distributorAccount.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: distributorAccount.createdAt,
    updatedAt: distributorAccount.updatedAt,
    distributorProfile: {
      id: distributorAccount.distributorProfile!.id,
      branchId: branch.id,
      distributorCode: distributorAccount.distributorProfile!.distributorCode,
    },
  } as unknown as TestAccount;

  const sale = await createPosSale(distributor, {
    items: [{ variantId: variantA, quantity: 2 }],
  });
  orderId = sale.orderId;
  created.orderIds.push(orderId);

  const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId }, select: { id: true } });
  orderItemId = item.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.swapRequest.deleteMany({ where: { orderId: { in: created.orderIds } } });
  await prisma.refund.deleteMany({ where: { orderId: { in: created.orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: created.orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: created.orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: created.orderIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.distributorProfile.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.customerProfile.deleteMany({ where: { branchId: { in: created.branchIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });
  await prisma.warehouse.deleteMany({ where: { id: { in: created.warehouseIds } } });
  await prisma.branch.deleteMany({ where: { id: { in: created.branchIds } } });
});

async function onHand(): Promise<number> {
  const item = await prisma.inventoryItem.findFirstOrThrow({
    where: { variantId: variantA, warehouseId },
    select: { quantityOnHand: true },
  });

  return item.quantityOnHand;
}

describe("parseSwapInput", () => {
  it("accepts a line, quantity and reason", () => {
    const input = parseSwapInput({ orderItemId, quantity: 2, reason: "different size" });

    expect(input).toEqual({ orderItemId, quantity: 2, reason: "different size" });
  });

  it("rejects malformed payloads and unknown fields", () => {
    expect(() => parseSwapInput({ orderItemId: "nope", quantity: 1 })).toThrowError();
    expect(() => parseSwapInput({ orderItemId, quantity: 0 })).toThrowError();
    expect(() => parseSwapInput({ orderItemId, quantity: 1, extra: true })).toThrowError();
    expect(() => parseSwapInput("nope")).toThrowError();
  });

  it("caps the reason length", () => {
    expect(() => parseSwapInput({ orderItemId, quantity: 1, reason: "x".repeat(301) })).toThrowError();
  });
});

describe("parseSwapStage", () => {
  it("accepts only the five stages", () => {
    expect(parseSwapStage("UNDER_REVIEW")).toBe("UNDER_REVIEW");
    expect(() => parseSwapStage("MAILED")).toThrowError();
    expect(() => parseSwapStage(3)).toThrowError();
  });
});

describe("requestPosSwap", () => {
  it("opens a request without touching stock", async () => {
    const before = await onHand();

    const swap = await requestPosSwap(distributor, orderId, { orderItemId, quantity: 1, reason: "مقاس مختلف" });

    expect(swap.stage).toBe("REQUESTED");
    expect(swap.quantity).toBe(1);
    expect(swap.restockedAt).toBeNull();
    expect(await onHand()).toBe(before);
  });

  it("refuses to swap more than what the sale still holds", async () => {
    await requestPosSwap(distributor, orderId, { orderItemId, quantity: 2 });

    await expect(
      requestPosSwap(distributor, orderId, { orderItemId, quantity: 1 }),
    ).rejects.toThrowError();
  });
});

describe("advancePosSwap", () => {
  it("walks the stages forward and restocks exactly once at approval", async () => {
    const before = await onHand();

    const swap = await requestPosSwap(distributor, orderId, { orderItemId, quantity: 2 });

    const reviewed = await advancePosSwap(distributor, swap.id, "UNDER_REVIEW");
    expect(reviewed.stage).toBe("UNDER_REVIEW");
    expect(await onHand()).toBe(before);

    const approved = await advancePosSwap(distributor, swap.id, "APPROVED");
    expect(approved.stage).toBe("APPROVED");
    expect(approved.restockedAt).not.toBeNull();
    expect(await onHand()).toBe(before + 2);

    const shipped = await advancePosSwap(distributor, swap.id, "SHIPPED");
    expect(shipped.stage).toBe("SHIPPED");
    expect(await onHand()).toBe(before + 2);

    const received = await advancePosSwap(distributor, swap.id, "RECEIVED");
    expect(received.stage).toBe("RECEIVED");

    const movements = await prisma.stockMovement.findMany({
      where: { variantId: variantA, warehouseId, type: "INTAKE" },
      select: { quantityChange: true, reason: true },
    });
    const swapIntake = movements.filter((movement) => movement.reason?.includes("استبدال"));
    expect(swapIntake).toHaveLength(1);
    expect(swapIntake[0].quantityChange).toBe(2);
  });

  it("refuses to move a stage backwards", async () => {
    const swap = await requestPosSwap(distributor, orderId, { orderItemId, quantity: 1 });
    const approved = await advancePosSwap(distributor, swap.id, "APPROVED");

    await expect(advancePosSwap(distributor, approved.id, "REQUESTED")).rejects.toThrowError();
    await expect(advancePosSwap(distributor, approved.id, "APPROVED")).rejects.toThrowError();
  });
});

describe("listOrderSwaps", () => {
  it("lists the swaps of the branch's sale", async () => {
    await requestPosSwap(distributor, orderId, { orderItemId, quantity: 1 });

    const swaps = await listOrderSwaps(distributor, orderId);

    expect(swaps).toHaveLength(1);
    expect(swaps[0].stage).toBe("REQUESTED");
    expect(swaps[0].quantity).toBe(1);
  });
});

describe("exportPosSalesCsv", () => {
  it("writes a BOM'd, CRLF sheet with the invoice", async () => {
    const csv = await exportPosSalesCsv(distributor, csvLabels);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Invoice,Date,Status,Payment,Units sold,Units returned,Total,Refunded,Net,Currency");
    expect(csv).toContain("80.00");
    expect(csv.split("\r\n").length).toBeGreaterThan(1);
  });
});
