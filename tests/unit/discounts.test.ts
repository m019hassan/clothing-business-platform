import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  discountedAmount,
  parsePromotionInput,
  pickBestDiscounts,
  promotionStatus,
} from "@/modules/catalog/application/promotions";

describe("discountedAmount", () => {
  it("applies the percent and rounds to two decimals", () => {
    expect(discountedAmount(new Prisma.Decimal("149.00"), 15).toString()).toBe("126.65");
    expect(discountedAmount(new Prisma.Decimal("100.00"), 15).toString()).toBe("85");
    expect(discountedAmount(new Prisma.Decimal("99.99"), 33).toString()).toBe("66.99");
  });
});

describe("pickBestDiscounts", () => {
  it("keeps the highest percent per product", () => {
    const map = pickBestDiscounts([
      { productId: "a", percent: 10 },
      { productId: "a", percent: 25 },
      { productId: "b", percent: 15 },
    ]);

    expect(map.get("a")).toBe(25);
    expect(map.get("b")).toBe(15);
  });

  it("returns an empty map for no entries", () => {
    expect(pickBestDiscounts([]).size).toBe(0);
  });
});

describe("promotionStatus", () => {
  const now = new Date("2026-10-12T12:00:00Z");

  it("knows all four states", () => {
    expect(promotionStatus({ isActive: false, startsAt: now, endsAt: now }, now)).toBe("STOPPED");
    expect(promotionStatus({ isActive: true, startsAt: new Date("2026-10-13T00:00:00Z"), endsAt: new Date("2026-10-14T00:00:00Z") }, now)).toBe("UPCOMING");
    expect(promotionStatus({ isActive: true, startsAt: new Date("2026-10-11T00:00:00Z"), endsAt: new Date("2026-10-14T00:00:00Z") }, now)).toBe("ACTIVE");
    expect(promotionStatus({ isActive: true, startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: new Date("2026-10-02T00:00:00Z") }, now)).toBe("EXPIRED");
  });
});

describe("parsePromotionInput", () => {
  const valid = {
    name: "خصم الجمعة",
    percent: 15,
    startsAt: "2026-10-12T09:00:00.000Z",
    endsAt: "2026-10-15T09:00:00.000Z",
    productIds: ["a1b2c3d4-0000-4000-8000-000000000001"],
  };

  it("accepts a valid payload and de-duplicates products", () => {
    const parsed = parsePromotionInput({ ...valid, productIds: [...valid.productIds, ...valid.productIds] });

    expect(parsed.percent).toBe(15);
    expect(parsed.productIds).toHaveLength(1);
  });

  it("rejects percent outside 1..90", () => {
    expect(() => parsePromotionInput({ ...valid, percent: 0 })).toThrowError();
    expect(() => parsePromotionInput({ ...valid, percent: 91 })).toThrowError();
  });

  it("rejects a window that ends before it starts", () => {
    expect(() => parsePromotionInput({ ...valid, endsAt: valid.startsAt })).toThrowError();
  });

  it("rejects an empty product selection", () => {
    expect(() => parsePromotionInput({ ...valid, productIds: [] })).toThrowError();
  });
});
