import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { addItem } from "@/modules/cart/application/cart-service";
import { createOrderFromCart } from "@/modules/order/application/orders";
import {
  getLatestPaymentProof,
  readPaymentProof,
  uploadPaymentProof,
} from "@/modules/payment/application/proofs";
import { ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;

let customer: TestAccount;
let variantId: string;
const created = {
  accountIds: [] as string[],
  profileIds: [] as string[],
  productIds: [] as string[],
  variantIds: [] as string[],
};

// A real 1x1 PNG; the storage layer checks the declared type and the size.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A DRAFT order with its pending bank transfer: the window a receipt belongs to. */
async function pendingOrderWithTransfer() {
  await addItem(customer, { variantId, quantity: 1 });
  const order = await createOrderFromCart(customer);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });

  // Receipts belong to bank transfers; the created payment defaults elsewhere.
  await prisma.payment.update({ where: { id: payment.id }, data: { method: "BANK_TRANSFER" } });

  return { orderId: order.id, paymentId: payment.id };
}

beforeEach(async () => {
  // Uploads land in a fresh folder under the OS temp directory for this run.
  process.env.UPLOAD_DIR = await mkdtemp(join(tmpdir(), "cbp-proofs-"));

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

  const customerRecord = await prisma.account.create({
    data: {
      accountType: "CUSTOMER",
      status: "ACTIVE",
      email: `vitest-proof-${suffix}@example.com`,
      phone: `+9665${Math.floor(10000000 + Math.random() * 89999999)}`,
      passwordHash: "test-hash",
      customerProfile: {
        create: {
          customerCode: `VITPRF-${suffix.toUpperCase()}`,
          classificationId: classification.id,
          firstName: "Vitest",
          lastName: "Proof",
        },
      },
    },
    include: { customerProfile: true },
  });

  const product = await prisma.product.create({
    data: {
      name: `Proof Product ${suffix}`,
      slug: `proof-product-${suffix}`,
      status: "ACTIVE",
      basePrice: "80.00",
      currency: "SAR",
      categoryId: category.id,
      variants: { create: [{ sku: `PRF-${suffix.toUpperCase()}`, status: "ACTIVE" }] },
    },
    include: { variants: true },
  });

  await prisma.inventoryItem.create({
    data: {
      variantId: product.variants[0].id,
      warehouseId: warehouse.id,
      quantityOnHand: 5,
      quantityReserved: 0,
    },
  });

  created.accountIds.push(customerRecord.id);
  created.profileIds.push(customerRecord.customerProfile!.id);
  created.productIds.push(product.id);
  created.variantIds.push(...product.variants.map((variant) => variant.id));
  variantId = product.variants[0].id;

  customer = {
    id: customerRecord.id,
    accountType: "CUSTOMER",
    status: "ACTIVE",
    email: customerRecord.email,
    phone: customerRecord.phone,
    emailVerified: false,
    phoneVerified: false,
    preferredLanguage: "ar",
    timezone: "Asia/Riyadh",
    createdAt: customerRecord.createdAt,
    updatedAt: customerRecord.updatedAt,
    customerProfile: { id: customerRecord.customerProfile!.id },
  } as TestAccount;
});

afterAll(async () => {
  const orders = await prisma.order.findMany({
    where: { customerProfileId: { in: created.profileIds } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.paymentProof.deleteMany({ where: { payment: { orderId: { in: orderIds } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.auditLog.deleteMany({ where: { accountId: { in: created.accountIds } } });
  await prisma.cartItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.stockMovement.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.inventoryItem.deleteMany({ where: { variantId: { in: created.variantIds } } });
  await prisma.productVariant.deleteMany({ where: { id: { in: created.variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: created.productIds } } });
  await prisma.customerProfile.deleteMany({ where: { id: { in: created.profileIds } } });
  await prisma.account.deleteMany({ where: { id: { in: created.accountIds } } });

  delete process.env.UPLOAD_DIR;
});

describe("payment receipts end to end", () => {
  it("stores a real PNG on disk and reads the exact bytes back", async () => {
    const { paymentId } = await pendingOrderWithTransfer();

    const proof = await uploadPaymentProof(customer, paymentId, {
      data: PNG,
      contentType: "image/png",
      originalName: "transfer.png",
    });

    expect(proof.mimeType).toBe("image/png");
    expect(proof.sizeBytes).toBe(PNG.byteLength);

    const latest = await getLatestPaymentProof(paymentId);
    expect(latest?.id).toBe(proof.id);

    const read = await readPaymentProof(customer, paymentId);
    expect(read.mimeType).toBe("image/png");
    expect(read.originalName).toBe("transfer.png");
    expect(Buffer.compare(read.data, PNG)).toBe(0);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "PAYMENT_PROOF_UPLOADED", entityId: paymentId },
    });
    expect(audit).not.toBeNull();
  });

  it("refuses a receipt that is not an allowed file type", async () => {
    const { paymentId } = await pendingOrderWithTransfer();

    await expect(
      uploadPaymentProof(customer, paymentId, {
        data: Buffer.from("not an image"),
        contentType: "text/plain",
        originalName: "receipt.txt",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await getLatestPaymentProof(paymentId)).toBeNull();
  });

  it("keeps a second receipt as the newest", async () => {
    const { paymentId } = await pendingOrderWithTransfer();

    await uploadPaymentProof(customer, paymentId, {
      data: PNG,
      contentType: "image/png",
      originalName: "first.png",
    });
    const second = await uploadPaymentProof(customer, paymentId, {
      data: PNG,
      contentType: "image/jpeg",
      originalName: "second.jpg",
    });

    const latest = await getLatestPaymentProof(paymentId);
    expect(latest?.id).toBe(second.id);
    expect(latest?.originalName).toBe("second.jpg");
  });
});
