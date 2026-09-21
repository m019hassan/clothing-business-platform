import { describe, expect, it } from "vitest";

import { adjustmentFormToPayload } from "@/modules/inventory/application/form-payloads";

const VARIANT_ID = "11111111-2222-4333-8444-555555555555";
const WAREHOUSE_ID = "99999999-8888-4777-8666-555555555555";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }

  return data;
}

describe("adjustmentFormToPayload", () => {
  it("maps a complete form, trimming the reason", () => {
    expect(
      adjustmentFormToPayload(
        form({
          variantId: VARIANT_ID,
          warehouseId: WAREHOUSE_ID,
          quantityChange: " -4 ",
          reason: "  Damaged in storage ",
        }),
      ),
    ).toEqual({
      variantId: VARIANT_ID,
      warehouseId: WAREHOUSE_ID,
      quantityChange: -4,
      reason: "Damaged in storage",
    });
  });

  it("omits optional fields that were not filled in", () => {
    expect(adjustmentFormToPayload(form({ variantId: VARIANT_ID, quantityChange: "5", reason: "   " }))).toEqual({
      variantId: VARIANT_ID,
      quantityChange: 5,
    });
  });

  it("surfaces a blank quantity as NaN so the service rejects it with 400", () => {
    const payload = adjustmentFormToPayload(form({ variantId: VARIANT_ID, quantityChange: "  " }));

    expect(Number.isNaN(payload.quantityChange)).toBe(true);
  });
});
