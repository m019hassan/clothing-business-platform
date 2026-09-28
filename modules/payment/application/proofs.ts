import "server-only";

import { AccountType, OrderStatus, PaymentStatus } from "@prisma/client";

import { hasPermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "@/src/lib/errors";
import { prisma } from "@/src/lib/db";
import { assertUploadAllowed, readUpload, saveUpload } from "@/src/lib/storage";
import { isUuid } from "@/src/lib/validation";

type Actor = NonNullable<SafeAccount>;

export type PaymentProofView = {
  id: string;
  paymentId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

const PROOF_STATUSES = [PaymentStatus.PENDING, PaymentStatus.PENDING_VERIFICATION];

/**
 * Pre-payment order states. A freshly created order is DRAFT until the customer
 * submits it, and the receipt is collected while the transfer is still pending -
 * both states belong to the same "not paid yet" window.
 */
const PROOF_ORDER_STATUSES = [OrderStatus.DRAFT, OrderStatus.PENDING_PAYMENT];

/** The newest receipt of a payment, or null. */
export async function getLatestPaymentProof(paymentId: string): Promise<PaymentProofView | null> {
  const proof = await prisma.paymentProof.findFirst({
    where: { paymentId },
    orderBy: { createdAt: "desc" },
  });

  if (!proof) {
    return null;
  }

  return {
    id: proof.id,
    paymentId: proof.paymentId,
    originalName: proof.originalName,
    mimeType: proof.mimeType,
    sizeBytes: proof.sizeBytes,
    createdAt: proof.createdAt.toISOString(),
  };
}

async function loadPaymentForActor(actor: Actor, paymentId: string) {
  if (!isUuid(paymentId)) {
    throw new NotFoundError("Payment not found.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      method: true,
      order: {
        select: {
          id: true,
          status: true,
          customerProfile: { select: { accountId: true } },
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError("Payment not found.");
  }

  const isOwner =
    actor.accountType === AccountType.CUSTOMER &&
    actor.customerProfile?.id !== undefined &&
    (await prisma.customerProfile.findFirst({
      where: { id: actor.customerProfile.id, accountId: actor.id },
      select: { id: true },
    })) !== null &&
    payment.order.customerProfile.accountId === actor.id;

  if (!isOwner) {
    const allowed = await hasPermission(PERMISSIONS.PAYMENTS_VIEW);

    if (!allowed) {
      throw new AuthorizationError("You do not have access to this payment.");
    }
  }

  return payment;
}

/**
 * Stores a receipt for a bank transfer. The customer who owns the order or staff
 * with payments.view may upload; only a payment that is still awaiting a decision
 * accepts a receipt, so the decision always has the document it was based on.
 */
export async function uploadPaymentProof(
  actor: Actor,
  paymentId: string,
  file: { data: Buffer; contentType: string; originalName: string },
): Promise<PaymentProofView> {
  assertUploadAllowed(file.contentType, file.data.byteLength);

  const payment = await loadPaymentForActor(actor, paymentId);

  if (payment.method !== "BANK_TRANSFER") {
    throw new ConflictError("Receipts are only collected for bank transfers.");
  }

  if (
    !(PROOF_STATUSES as PaymentStatus[]).includes(payment.status) ||
    !(PROOF_ORDER_STATUSES as OrderStatus[]).includes(payment.order.status)
  ) {
    throw new ConflictError("This payment already has a decision, so a receipt can no longer be attached.");
  }

  if (!file.originalName || file.originalName.trim().length === 0) {
    throw new ValidationError("The file needs a name.");
  }

  const stored = await saveUpload(file);

  const proof = await prisma.$transaction(async (transaction) => {
    const created = await transaction.paymentProof.create({
      data: {
        paymentId: payment.id,
        fileKey: stored.key,
        originalName: file.originalName.slice(0, 255),
        mimeType: file.contentType,
        sizeBytes: stored.sizeBytes,
        uploadedByAccountId: actor.id,
      },
    });

    await transaction.auditLog.create({
      data: {
        accountId: actor.id,
        action: "PAYMENT_PROOF_UPLOADED",
        entity: "Payment",
        entityId: payment.id,
        newValue: created.id,
      },
    });

    return created;
  });

  return {
    id: proof.id,
    paymentId: proof.paymentId,
    originalName: proof.originalName,
    mimeType: proof.mimeType,
    sizeBytes: proof.sizeBytes,
    createdAt: proof.createdAt.toISOString(),
  };
}

/** Reads the newest receipt for an authorized viewer. */
export async function readPaymentProof(
  actor: Actor,
  paymentId: string,
): Promise<{ data: Buffer; mimeType: string; originalName: string }> {
  await loadPaymentForActor(actor, paymentId);

  const proof = await prisma.paymentProof.findFirst({
    where: { paymentId },
    orderBy: { createdAt: "desc" },
    select: { fileKey: true, mimeType: true, originalName: true },
  });

  if (!proof) {
    throw new NotFoundError("No receipt was uploaded for this payment.");
  }

  const data = await readUpload(proof.fileKey);

  if (!data) {
    throw new NotFoundError("The stored receipt could not be found.");
  }

  return { data, mimeType: proof.mimeType, originalName: proof.originalName };
}
