import type { PaymentMethod } from "@prisma/client";

import { ValidationError } from "@/src/lib/errors";

/**
 * Methods a customer may pick when placing an order. `MANUAL_TRANSFER_VERIFICATION`
 * is a staff-side confirmation step and `CASH` belongs to the point of sale, so
 * neither is offered to the customer here.
 */
export const CUSTOMER_PAYMENT_METHODS = ["CASH_ON_DELIVERY", "BANK_TRANSFER"] as const;

export type CustomerPaymentMethod = (typeof CUSTOMER_PAYMENT_METHODS)[number];

export const DEFAULT_CUSTOMER_PAYMENT_METHOD: CustomerPaymentMethod = "CASH_ON_DELIVERY";

export const PAYMENT_METHOD_LABELS: Record<CustomerPaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  BANK_TRANSFER: "Bank transfer",
};

/** Validates the method a customer chose; unknown values are rejected. */
export function parseCustomerPaymentMethod(value: unknown): CustomerPaymentMethod {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_CUSTOMER_PAYMENT_METHOD;
  }

  if (
    typeof value !== "string" ||
    !(CUSTOMER_PAYMENT_METHODS as readonly string[]).includes(value)
  ) {
    throw new ValidationError(`paymentMethod must be one of: ${CUSTOMER_PAYMENT_METHODS.join(", ")}.`);
  }

  return value as CustomerPaymentMethod;
}

/** Payment methods that can still be settled by the store (not final yet). */
export function isAwaitingSettlement(method: PaymentMethod | null): boolean {
  return method === null || method === "CASH_ON_DELIVERY" || method === "BANK_TRANSFER";
}
