import { describe, expect, it } from "vitest";

import {
  CUSTOMER_PAYMENT_METHODS,
  DEFAULT_CUSTOMER_PAYMENT_METHOD,
  isAwaitingSettlement,
  parseCustomerPaymentMethod,
} from "@/modules/payment/application/methods";

describe("parseCustomerPaymentMethod", () => {
  it("accepts the customer-facing methods", () => {
    for (const method of CUSTOMER_PAYMENT_METHODS) {
      expect(parseCustomerPaymentMethod(method)).toBe(method);
    }
  });

  it("defaults when nothing was chosen", () => {
    expect(parseCustomerPaymentMethod(undefined)).toBe(DEFAULT_CUSTOMER_PAYMENT_METHOD);
    expect(parseCustomerPaymentMethod(null)).toBe(DEFAULT_CUSTOMER_PAYMENT_METHOD);
    expect(parseCustomerPaymentMethod("")).toBe(DEFAULT_CUSTOMER_PAYMENT_METHOD);
  });

  it("rejects staff-side and unknown methods", () => {
    expect(() => parseCustomerPaymentMethod("CASH")).toThrowError();
    expect(() => parseCustomerPaymentMethod("MANUAL_TRANSFER_VERIFICATION")).toThrowError();
    expect(() => parseCustomerPaymentMethod("ONLINE_GATEWAY")).toThrowError();
    expect(() => parseCustomerPaymentMethod(42)).toThrowError();
  });
});

describe("isAwaitingSettlement", () => {
  it("flags the methods the store still has to settle", () => {
    expect(isAwaitingSettlement("CASH_ON_DELIVERY")).toBe(true);
    expect(isAwaitingSettlement("BANK_TRANSFER")).toBe(true);
    expect(isAwaitingSettlement(null)).toBe(true);
    expect(isAwaitingSettlement("CASH")).toBe(false);
    expect(isAwaitingSettlement("ONLINE_GATEWAY")).toBe(false);
  });
});
