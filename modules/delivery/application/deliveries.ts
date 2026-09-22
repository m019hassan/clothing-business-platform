import "server-only";

import { DeliveryStatus, Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { createNotification } from "@/modules/notification/application/notifications";
import type {
  DeliveryListPage,
  DeliveryQueueItemView,
  DeliveryView,
} from "@/modules/delivery/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_CARRIER = 100;
const MAX_TRACKING = 100;
const MAX_NOTES = 2000;

/** PENDING -> PROCESSING -> READY -> SHIPPED -> DELIVERED (CANCELLED leaves the flow). */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY", "CANCELLED"],
  READY: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const TERMINAL_STATUSES: readonly DeliveryStatus[] = ["DELIVERED", "CANCELLED"];

export type DeliveryUpdateInput = {
  status?: DeliveryStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseOptionalText(value: unknown, field: string, max: number): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string or null.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

/** Validates a delivery update payload. Unknown keys are rejected. */
export function parseDeliveryUpdateInput(payload: unknown): DeliveryUpdateInput {
  const body = asRecord(payload);
  const allowed = ["status", "carrier", "trackingNumber", "notes"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: DeliveryUpdateInput = {};

  if (body.status !== undefined) {
    const statuses = Object.keys(DELIVERY_TRANSITIONS) as DeliveryStatus[];

    if (typeof body.status !== "string" || !statuses.includes(body.status as DeliveryStatus)) {
      throw new ValidationError(`status must be one of: ${statuses.join(", ")}.`);
    }

    input.status = body.status as DeliveryStatus;
  }

  if (body.carrier !== undefined) input.carrier = parseOptionalText(body.carrier, "carrier", MAX_CARRIER);
  if (body.trackingNumber !== undefined) {
    input.trackingNumber = parseOptionalText(body.trackingNumber, "trackingNumber", MAX_TRACKING);
  }
  if (body.notes !== undefined) input.notes = parseOptionalText(body.notes, "notes", MAX_NOTES);

  if (Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

const deliverySelection = {
  id: true,
  orderId: true,
  status: true,
  carrier: true,
  trackingNumber: true,
  notes: true,
  dispatchedAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { orderNumber: true } },
} satisfies Prisma.DeliverySelect;

type DeliveryRecord = Prisma.DeliveryGetPayload<{ select: typeof deliverySelection }>;

function mapDelivery(record: DeliveryRecord): DeliveryView {
  return {
    id: record.id,
    orderId: record.orderId,
    orderNumber: record.order.orderNumber,
    status: record.status,
    carrier: record.carrier,
    trackingNumber: record.trackingNumber,
    notes: record.notes,
    dispatchedAt: record.dispatchedAt?.toISOString() ?? null,
    deliveredAt: record.deliveredAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Creates the delivery row for an order (idempotent). Called from the payment
 * approval transaction so a confirmed order always has a fulfilment record.
 */
export async function ensureDeliveryForOrder(
  transaction: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  await transaction.delivery.upsert({
    where: { orderId },
    create: { orderId },
    update: {},
  });
}

/** Cancels the delivery of an order (used when the order itself is cancelled). */
export async function cancelDeliveryForOrder(
  transaction: Prisma.TransactionClient,
  orderId: string,
): Promise<number> {
  const result = await transaction.delivery.updateMany({
    where: { orderId, status: { notIn: [...TERMINAL_STATUSES] } },
    data: { status: "CANCELLED" },
  });

  return result.count;
}

export type DeliveryFilters = { status?: DeliveryStatus };

export function parseDeliveryFilters(searchParams: URLSearchParams): DeliveryFilters {
  const filters: DeliveryFilters = {};
  const status = searchParams.get("status");

  if (status !== null) {
    const statuses = Object.keys(DELIVERY_TRANSITIONS) as DeliveryStatus[];

    if (!statuses.includes(status as DeliveryStatus)) {
      throw new ValidationError(`status must be one of: ${statuses.join(", ")}.`);
    }

    filters.status = status as DeliveryStatus;
  }

  return filters;
}

/** Staff fulfilment queue. Requires shipping.manage. */
export async function listDeliveries(
  account: AuthenticatedAccount,
  pagination: Pagination,
  filters: DeliveryFilters = {},
): Promise<DeliveryListPage> {
  await requirePermission(PERMISSIONS.SHIPPING_MANAGE);

  const where: Prisma.DeliveryWhereInput = filters.status ? { status: filters.status } : {};

  return withDatabaseError(async () => {
    const [records, total] = await prisma.$transaction([
      prisma.delivery.findMany({
        where,
        select: {
          ...deliverySelection,
          order: {
            select: {
              orderNumber: true,
              status: true,
              totalAmount: true,
              currency: true,
              customerProfile: { select: { firstName: true, lastName: true, customerCode: true } },
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.delivery.count({ where }),
    ]);

    const deliveries: DeliveryQueueItemView[] = records.map((record) => ({
      ...mapDelivery(record as DeliveryRecord),
      orderStatus: record.order.status,
      customerName: [record.order.customerProfile.firstName, record.order.customerProfile.lastName]
        .filter(Boolean)
        .join(" "),
      customerCode: record.order.customerProfile.customerCode,
      totalAmount: record.order.totalAmount.toString(),
      currency: record.order.currency,
    }));

    return {
      deliveries,
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

export async function getDelivery(
  account: AuthenticatedAccount,
  deliveryId: string,
): Promise<DeliveryView> {
  await requirePermission(PERMISSIONS.SHIPPING_MANAGE);

  if (!isUuid(deliveryId)) {
    throw new NotFoundError("Delivery not found.");
  }

  const record = await withDatabaseError(() =>
    prisma.delivery.findUnique({ where: { id: deliveryId }, select: deliverySelection }),
  );

  if (!record) {
    throw new NotFoundError("Delivery not found.");
  }

  return mapDelivery(record);
}

/**
 * Advances a delivery (shipping.manage). Transitions are validated against the
 * delivery state machine, SHIPPED requires a carrier and tracking number, and an
 * audit row records every change.
 */
export async function updateDelivery(
  account: AuthenticatedAccount,
  deliveryId: string,
  payload: unknown,
): Promise<DeliveryView> {
  await requirePermission(PERMISSIONS.SHIPPING_MANAGE);

  if (!isUuid(deliveryId)) {
    throw new NotFoundError("Delivery not found.");
  }

  const input = parseDeliveryUpdateInput(payload);

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const current = await transaction.delivery.findUnique({
        where: { id: deliveryId },
        select: {
          id: true,
          orderId: true,
          status: true,
          carrier: true,
          trackingNumber: true,
          order: {
            select: {
              orderNumber: true,
              customerProfile: { select: { accountId: true } },
            },
          },
        },
      });

      if (!current) {
        throw new NotFoundError("Delivery not found.");
      }

      if (current.status === "CANCELLED") {
        throw new ConflictError("A cancelled delivery can no longer be edited.");
      }

      const data: Prisma.DeliveryUpdateInput = {};
      let auditAction: string | null = null;

      if (input.status !== undefined && input.status !== current.status) {
        const allowed = DELIVERY_TRANSITIONS[current.status];

        if (!allowed.includes(input.status)) {
          throw new ConflictError(
            `A delivery in ${current.status} cannot move to ${input.status}. Allowed: ${
              allowed.length > 0 ? allowed.join(", ") : "none (terminal state)"
            }.`,
          );
        }

        const carrier = input.carrier ?? current.carrier;
        const trackingNumber = input.trackingNumber ?? current.trackingNumber;

        if (input.status === "SHIPPED" && (!carrier || !trackingNumber)) {
          throw new ValidationError("A carrier and a tracking number are required to ship a delivery.");
        }

        data.status = input.status;

        if (input.status === "SHIPPED") {
          data.dispatchedAt = new Date();
        }

        if (input.status === "DELIVERED") {
          data.deliveredAt = new Date();
        }

        auditAction = "DELIVERY_STATUS_CHANGED";
      }

      if (input.carrier !== undefined) data.carrier = input.carrier;
      if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;
      if (input.notes !== undefined) data.notes = input.notes;

      if (Object.keys(data).length === 0) {
        throw new ValidationError("Provide at least one field to update.");
      }

      const updated = await transaction.delivery.update({
        where: { id: deliveryId },
        data,
        select: deliverySelection,
      });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: auditAction ?? "DELIVERY_UPDATED",
          entity: "Delivery",
          entityId: deliveryId,
          oldValue: current.status,
          newValue: updated.status,
        },
      });

      if (auditAction === "DELIVERY_STATUS_CHANGED") {
        const label = updated.status.replaceAll("_", " ").toLowerCase();
        const details = [
          updated.carrier ? `Carrier: ${updated.carrier}.` : null,
          updated.trackingNumber ? `Tracking number: ${updated.trackingNumber}.` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" ");

        await createNotification(transaction, {
          accountId: current.order.customerProfile.accountId,
          type: "DELIVERY",
          title: `Delivery for ${current.order.orderNumber} is ${label}`,
          body: details.length > 0 ? details : undefined,
          entityType: "Order",
          entityId: current.orderId,
        });
      }

      return mapDelivery(updated);
    }),
  );
}
