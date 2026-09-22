import { describe, expect, it } from "vitest";

import { branchFormToPayload } from "@/modules/branches/application/form-payloads";

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => data.append(key, entry));
    } else {
      data.append(key, value);
    }
  }

  return data;
}

describe("branchFormToPayload", () => {
  it("maps a create form with its warehouse selection", () => {
    const payload = branchFormToPayload(
      form({
        code: " br-ryd ",
        name: " Riyadh ",
        phone: "  ",
        city: "Riyadh",
        isActive: "on",
        warehouseIds: ["11111111-2222-4333-8444-555555555555"],
      }),
      { partial: false },
    );

    expect(payload).toEqual({
      code: "br-ryd",
      name: "Riyadh",
      phone: null,
      city: "Riyadh",
      address: null,
      isActive: true,
      warehouseIds: ["11111111-2222-4333-8444-555555555555"],
    });
  });

  it("treats an unchecked box as a deactivation on partial updates", () => {
    const payload = branchFormToPayload(form({ name: "X", isActiveProvided: "1" }), { partial: true });

    expect(payload.isActive).toBe(false);
    expect(payload.warehouseIds).toEqual([]);
    expect(payload).not.toHaveProperty("code");
  });

  it("leaves the flag out when the form does not carry the checkbox", () => {
    const payload = branchFormToPayload(form({ name: "X" }), { partial: true });

    expect(payload).not.toHaveProperty("isActive");
  });
});
