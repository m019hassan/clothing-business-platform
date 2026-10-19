import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/application/authorization", () => ({
  requirePermission: vi.fn(async () => undefined),
  hasPermission: vi.fn(async () => true),
  getCurrentPermissions: vi.fn(async () => new Set<string>()),
}));

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import {
  computeLineTax,
  getTaxSetting,
  parseTaxPayload,
  saveTaxSetting,
} from "@/modules/catalog/application/taxes";
import { prisma } from "@/src/lib/db";

type TestAccount = NonNullable<SafeAccount>;
const account = { id: "00000000-0000-4000-8000-00000000cafe", accountType: "EMPLOYEE" } as TestAccount;

beforeEach(async () => {
  await prisma.taxSetting.deleteMany();
});

afterAll(async () => {
  await prisma.taxSetting.deleteMany();
});

describe("vat math", () => {
  it("takes the tax out of an inclusive price", () => {
    const result = computeLineTax(new Prisma.Decimal("114.00"), new Prisma.Decimal("14"), true);
    expect(result.taxAmount.toFixed(2)).toBe("14.00");
    expect(result.payable.toFixed(2)).toBe("114.00");
  });

  it("adds the tax on top when prices exclude it", () => {
    const result = computeLineTax(new Prisma.Decimal("100.00"), new Prisma.Decimal("14"), false);
    expect(result.taxAmount.toFixed(2)).toBe("14.00");
    expect(result.payable.toFixed(2)).toBe("114.00");
  });

  it("handles two decimals and zero rate", () => {
    expect(computeLineTax(new Prisma.Decimal("99.99"), new Prisma.Decimal("15"), true).taxAmount.toFixed(2)).toBe("13.04");
    expect(computeLineTax(new Prisma.Decimal("99.99"), new Prisma.Decimal("0"), false).taxAmount.toFixed(2)).toBe("0.00");
  });
});

describe("vat settings", () => {
  it("falls back to off before the first save", async () => {
    const setting = await getTaxSetting();
    expect(setting.enabled).toBe(false);
    expect(setting.ratePercent).toBe("0.00");
    expect(setting.inclusive).toBe(true);
  });

  it("saves any rate the shop picks and reads it back", async () => {
    const saved = await saveTaxSetting(account, { enabled: true, ratePercent: 14, inclusive: false });
    expect(saved.enabled).toBe(true);
    expect(saved.ratePercent).toBe("14.00");
    expect(saved.inclusive).toBe(false);

    const read = await getTaxSetting();
    expect(read.ratePercent).toBe("14.00");

    const updated = await saveTaxSetting(account, { enabled: false, ratePercent: "12.5", inclusive: true });
    expect(updated.enabled).toBe(false);
    expect(updated.ratePercent).toBe("12.50");
  });

  it("rejects rates outside 0..100 and missing values", () => {
    expect(() => parseTaxPayload({ ratePercent: 140 })).toThrowError(/between 0 and 100/);
    expect(() => parseTaxPayload({ ratePercent: -1 })).toThrowError(/between 0 and 100/);
    expect(() => parseTaxPayload({})).toThrowError(/required/);
    expect(() => parseTaxPayload({ ratePercent: "abc" })).toThrowError(/must be a number/);
  });
});
