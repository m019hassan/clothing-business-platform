import "server-only";

import { NotificationType, Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { resolveBranchScope } from "@/modules/branches/application/scope";
import { transferStock } from "@/modules/inventory/application/transfers";
import { colorLibraryIndex, normalizeColorKey } from "@/modules/catalog/application/colors";
import { createNotification } from "@/modules/notification/application/notifications";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { formatVariantAttributes } from "@/src/lib/format";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type StockRequestItemView = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  imageId: string | null;
  quantity: number;
};

export type StockRequestView = {
  id: string;
  branchName: string;
  branchCode: string;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  note: string | null;
  itemCount: number;
  totalUnits: number;
  items: StockRequestItemView[];
  createdAt: string;
  fulfilledAt: string | null;
  requestedByAccountId: string;
};

const requestInclude = {
  branch: { select: { name: true, code: true } },
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      variantId: true,
      quantity: true,
      variant: { select: { productId: true, sku: true, size: true, color: true, product: { select: { name: true } } } },
    },
  },
} satisfies Prisma.StockRequestInclude;

type RequestRecord = Prisma.StockRequestGetPayload<{ include: typeof requestInclude }>;

type ItemMedia = {
  imageByVariant: Map<string, string>;
  imageByProduct: Map<string, string>;
  colorHexByKey: Map<string, string>;
};

function toView(request: RequestRecord, media: ItemMedia): StockRequestView {
  const items: StockRequestItemView[] = request.items.map((item) => ({
    id: item.id,
    variantId: item.variantId,
    sku: item.variant.sku,
    productName: item.variant.product.name,
    size: item.variant.size,
    color: item.variant.color,
    colorHex: media.colorHexByKey.get(normalizeColorKey(item.variant.color ?? "")) ?? null,
    imageId: media.imageByVariant.get(item.variantId) ?? media.imageByProduct.get(item.variant.productId) ?? null,
    quantity: item.quantity,
  }));

  return {
    id: request.id,
    branchName: request.branch.name,
    branchCode: request.branch.code,
    status: request.status,
    note: request.note,
    itemCount: items.length,
    totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    createdAt: request.createdAt.toISOString(),
    fulfilledAt: request.fulfilledAt?.toISOString() ?? null,
    requestedByAccountId: request.requestedByAccountId,
  };
}

/** Loads per-colour photos and hexes once for a batch of requests. */
async function decorateRequests(requests: RequestRecord[]): Promise<StockRequestView[]> {
  if (requests.length === 0) {
    return [];
  }

  const productIds = [
    ...new Set(requests.flatMap((request) => request.items.map((item) => item.variant.productId))),
  ];

  const images = await withDatabaseError(() =>
    prisma.productImage.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, productId: true, variantId: true },
    }),
  );

  const imageByVariant = new Map<string, string>();
  const imageByProduct = new Map<string, string>();

  for (const image of images) {
    if (image.variantId && !imageByVariant.has(image.variantId)) {
      imageByVariant.set(image.variantId, image.id);
    }

    if (!imageByProduct.has(image.productId)) {
      imageByProduct.set(image.productId, image.id);
    }
  }

  const library = await colorLibraryIndex();
  const colorHexByKey = new Map<string, string>();

  for (const [key, entry] of library) {
    colorHexByKey.set(key, entry.hex);
  }

  const media: ItemMedia = { imageByVariant, imageByProduct, colorHexByKey };

  return requests.map((request) => toView(request, media));
}

export function parseStockRequestInput(
  payload: unknown,
): { items: { variantId: string; quantity: number }[]; note: string | null } {
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const merged = new Map<string, number>();

  for (const entry of rawItems) {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    const variantId = typeof item.variantId === "string" && isUuid(item.variantId) ? item.variantId : null;
    const quantity = typeof item.quantity === "number" ? item.quantity : Number(item.quantity);

    if (!variantId) {
      throw new ValidationError("Every line needs a variant.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new ValidationError("Quantities must be whole numbers between 1 and 999.");
    }

    merged.set(variantId, (merged.get(variantId) ?? 0) + quantity);
  }

  if (merged.size === 0) {
    throw new ValidationError("Add at least one item to the request.");
  }

  if (merged.size > 50) {
    throw new ValidationError("Too many lines (maximum 50).");
  }

  for (const quantity of merged.values()) {
    if (quantity > 999) {
      throw new ValidationError("Quantities must be whole numbers between 1 and 999.");
    }
  }

  const note = typeof body.note === "string" && body.note.trim() !== "" ? body.note.trim().slice(0, 300) : null;

  return { items: [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity })), note };
}

/** The people who run the warehouse: every active holder of inventory.adjust. */
export async function listStockAdjusters(): Promise<string[]> {
  const holders = await withDatabaseError(() =>
    prisma.employeeProfile.findMany({
      where: {
        account: { status: "ACTIVE" },
        employeeRoles: {
          some: {
            role: {
              isActive: true,
              rolePermissions: { some: { permission: { code: "inventory.adjust", isActive: true } } },
            },
          },
        },
      },
      select: { accountId: true },
    }),
  );

  return [...new Set(holders.map((holder) => holder.accountId))];
}

async function notifyStockAdjusters(title: string, body: string, requestId: string): Promise<void> {
  const recipients = await listStockAdjusters();

  for (const accountId of recipients) {
    await withDatabaseError(() =>
      createNotification(prisma, {
        accountId,
        type: NotificationType.INVENTORY,
        title,
        body,
        entityType: "StockRequest",
        entityId: requestId,
      }),
    );
  }
}

export async function createStockRequest(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<StockRequestView> {
  const input = parseStockRequestInput(payload);
  const scope = await resolveBranchScope(account);

  if (!scope.branchId) {
    throw new ValidationError("Stock requests are made from inside a branch.");
  }

  const branchId = scope.branchId;

  const found = await withDatabaseError(() =>
    prisma.productVariant.count({
      where: { id: { in: input.items.map((item) => item.variantId) }, status: "ACTIVE", product: { deletedAt: null } },
    }),
  );

  if (found !== input.items.length) {
    throw new ValidationError("One or more items are no longer available.");
  }

  const request = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const created = await transaction.stockRequest.create({
        data: {
          branchId,
          requestedByAccountId: account.id,
          note: input.note,
          items: { create: input.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })) },
        },
        include: requestInclude,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "STOCK_REQUEST_CREATED",
          entity: "StockRequest",
          entityId: created.id,
          newValue: `${created.items.length} lines — ${created.branch.code}`,
        },
      });

      return created;
    }),
  );

  await notifyStockAdjusters(
    `طلبية توريد جديدة من ${request.branch.name}`,
    `${request.items.length} صنف بانتظار التجهيز — افتح «طلبات التوريد» للتنفيذ.`,
    request.id,
  );

  return (await decorateRequests([request]))[0];
}

export async function listStockRequests(account: AuthenticatedAccount): Promise<StockRequestView[]> {
  const scope = await resolveBranchScope(account);

  const requests = await withDatabaseError(() =>
    prisma.stockRequest.findMany({
      where: scope.branchId ? { branchId: scope.branchId } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: requestInclude,
    }),
  );

  return decorateRequests(requests);
}

export async function cancelStockRequest(account: AuthenticatedAccount, requestId: string): Promise<StockRequestView> {

  if (!isUuid(requestId)) {
    throw new NotFoundError("The request was not found.");
  }

  const request = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const current = await transaction.stockRequest.findUnique({
        where: { id: requestId },
        select: { id: true, status: true, requestedByAccountId: true },
      });

      if (!current || current.requestedByAccountId !== account.id) {
        throw new NotFoundError("The request was not found.");
      }

      if (current.status !== "PENDING") {
        throw new ValidationError("Only pending requests can be cancelled.");
      }

      const updated = await transaction.stockRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
        include: requestInclude,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "STOCK_REQUEST_CANCELLED",
          entity: "StockRequest",
          entityId: requestId,
          newValue: "cancelled",
        },
      });

      return updated;
    }),
  );

  return (await decorateRequests([request]))[0];
}

export async function fulfillStockRequest(
  account: AuthenticatedAccount,
  requestId: string,
  payload: unknown,
  locale: "ar" | "en" = "ar",
): Promise<StockRequestView> {
  await requirePermission(PERMISSIONS.INVENTORY_ADJUST);

  if (!isUuid(requestId)) {
    throw new NotFoundError("The request was not found.");
  }

  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const fromWarehouseId = typeof body.fromWarehouseId === "string" && isUuid(body.fromWarehouseId) ? body.fromWarehouseId : null;

  if (!fromWarehouseId) {
    throw new ValidationError("Pick the warehouse to ship from.");
  }

  const warehouse = await withDatabaseError(() =>
    prisma.warehouse.findUnique({ where: { id: fromWarehouseId }, select: { id: true, isActive: true } }),
  );

  if (!warehouse || !warehouse.isActive) {
    throw new NotFoundError("The warehouse was not found.");
  }

  const request = await withDatabaseError(() =>
    prisma.stockRequest.findUnique({ where: { id: requestId }, include: requestInclude }),
  );

  if (!request) {
    throw new NotFoundError("The request was not found.");
  }

  if (request.status !== "PENDING") {
    throw new ValidationError("This request is not pending anymore.");
  }

  // All-or-nothing: verify the warehouse can cover every line before moving anything.
  const balances = await withDatabaseError(() =>
    prisma.inventoryItem.findMany({
      where: { warehouseId: fromWarehouseId, variantId: { in: request.items.map((item) => item.variantId) } },
      select: { variantId: true, quantityOnHand: true, quantityReserved: true },
    }),
  );

  const availableByVariant = new Map<string, number>();

  for (const balance of balances) {
    availableByVariant.set(
      balance.variantId,
      (availableByVariant.get(balance.variantId) ?? 0) + balance.quantityOnHand - balance.quantityReserved,
    );
  }

  const shortages = request.items.filter(
    (item) => (availableByVariant.get(item.variantId) ?? 0) < item.quantity,
  );

  if (shortages.length > 0) {
    const lines = shortages.slice(0, 5).map((item) => {
      const available = availableByVariant.get(item.variantId) ?? 0;
      const attrs = formatVariantAttributes(
        item.variant.size,
        item.variant.color,
        locale === "ar" ? "بدون مقاس" : "no size",
      );
      const label = locale === "ar" ? "ناقص" : "short by";

      return `«${item.variant.product.name}» (${attrs}): ${label} ${item.quantity - available}`;
    });

    if (shortages.length > 5) {
      lines.push(locale === "ar" ? `و${shortages.length - 5} أصناف كمان` : `and ${shortages.length - 5} more items`);
    }

    const intro = locale === "ar" ? "كمية المخزن أقل من المطلوب:" : "The warehouse is short:";
    const outro = locale === "ar" ? "رصّف المخزن أو قسّم الطلبية." : "restock it or split the request.";

    throw new ValidationError(`${intro} ${lines.join("، ")} — ${outro}`, {
      shortages: shortages.map((item) => ({
        variantId: item.variantId,
        name: item.variant.product.name,
        size: item.variant.size,
        color: item.variant.color,
        needed: item.quantity,
        available: availableByVariant.get(item.variantId) ?? 0,
      })),
    });
  }

  for (const item of request.items) {
    await transferStock(account, {
      variantId: item.variantId,
      fromWarehouseId,
      toBranchId: request.branchId,
      quantity: item.quantity,
      note: `طلبية توريد — ${request.branch.code}`,
    });
  }

  const updated = await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const fulfilled = await transaction.stockRequest.update({
        where: { id: requestId },
        data: { status: "FULFILLED", fulfilledByAccountId: account.id, fulfilledAt: new Date() },
        include: requestInclude,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "STOCK_REQUEST_FULFILLED",
          entity: "StockRequest",
          entityId: requestId,
          newValue: `${request.items.length} lines`,
        },
      });

      return fulfilled;
    }),
  );

  await withDatabaseError(() =>
    createNotification(prisma, {
      accountId: request.requestedByAccountId,
      type: NotificationType.INVENTORY,
      title: "تم تجهيز طلبيتك ✓",
      body: `${request.items.length} صنف وصلوا محل فرعك — ${request.branch.name}.`,
      entityType: "StockRequest",
      entityId: requestId,
    }),
  );

  return (await decorateRequests([updated]))[0];
}

export type RequestableVariant = {
  variantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  imageId: string | null;
};

/** Everything a branch can ask the warehouse for: the whole active catalogue. */
export async function listRequestableVariants(): Promise<RequestableVariant[]> {

  const variants = await withDatabaseError(() =>
    prisma.productVariant.findMany({
      where: { status: "ACTIVE", product: { status: "ACTIVE", deletedAt: null } },
      orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
      take: 1000,
      select: { id: true, productId: true, sku: true, size: true, color: true, product: { select: { name: true } } },
    }),
  );

  const productIds = [...new Set(variants.map((variant) => variant.productId))];
  const images = await withDatabaseError(() =>
    prisma.productImage.findMany({
      where: { productId: { in: productIds } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, productId: true, variantId: true },
    }),
  );

  const imageByVariant = new Map<string, string>();
  const imageByProduct = new Map<string, string>();

  for (const image of images) {
    if (image.variantId && !imageByVariant.has(image.variantId)) {
      imageByVariant.set(image.variantId, image.id);
    }

    if (!imageByProduct.has(image.productId)) {
      imageByProduct.set(image.productId, image.id);
    }
  }

  const library = await colorLibraryIndex();

  return variants.map((variant) => ({
    variantId: variant.id,
    productName: variant.product.name,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    colorHex: library.get(normalizeColorKey(variant.color ?? ""))?.hex ?? null,
    imageId: imageByVariant.get(variant.id) ?? imageByProduct.get(variant.productId) ?? null,
  }));
}
