import { describe, expect, it } from "vitest";

import { computeProfitReport } from "@/modules/reports/application/profit";
import type { ProfitLine } from "@/modules/reports/types";

function line(overrides: Partial<ProfitLine> = {}): ProfitLine {
  return {
    productId: "p1",
    productName: "بنطلون",
    netUnits: 2,
    unitPrice: "100.00",
    unitCost: "60.00",
    currency: "EGP",
    ...overrides,
  };
}

describe("computeProfitReport", () => {
  it("aggregates lines per product and computes profit", () => {
    const report = computeProfitReport([line(), line({ netUnits: 1 })]);

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ netUnits: 3, revenue: "300.00", cost: "180.00", profit: "120.00" });
    expect(report.totals).toMatchObject({ revenue: "300.00", cost: "180.00", profit: "120.00", netUnits: 3, missingCostUnits: 0 });
  });

  it("flags units without a cost snapshot and adds no cost for them", () => {
    const report = computeProfitReport([line({ unitCost: null, netUnits: 4 })]);

    expect(report.totals.missingCostUnits).toBe(4);
    expect(report.totals.cost).toBe("0.00");
    expect(report.totals.profit).toBe("400.00");
    expect(report.rows[0].missingCostUnits).toBe(4);
  });

  it("skips zero and negative net units", () => {
    const report = computeProfitReport([line({ netUnits: 0 }), line({ netUnits: -1 })]);

    expect(report.rows).toHaveLength(0);
    expect(report.totals.netUnits).toBe(0);
  });

  it("keeps two products apart and sorts by profit", () => {
    const report = computeProfitReport([
      line({ productId: "p2", productName: "قميص", netUnits: 1, unitPrice: "100.00", unitCost: "90.00" }),
      line({ productId: "p1", productName: "بنطلون", netUnits: 1, unitPrice: "100.00", unitCost: "10.00" }),
    ]);

    expect(report.rows.map((row) => row.productId)).toEqual(["p1", "p2"]);
    expect(report.totals.profit).toBe("100.00");
  });

  it("handles empty input", () => {
    const report = computeProfitReport([]);

    expect(report.rows).toEqual([]);
    expect(report.totals.revenue).toBe("0.00");
    expect(report.totals.missingCostUnits).toBe(0);
  });
});
