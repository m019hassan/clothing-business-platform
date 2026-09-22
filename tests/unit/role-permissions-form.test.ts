import { describe, expect, it } from "vitest";

import { rolePermissionsFormToPayload } from "@/modules/employees/application/form-payloads";

function form(values: string[]): FormData {
  const data = new FormData();

  for (const value of values) {
    data.append("permissionCodes", value);
  }

  return data;
}

describe("rolePermissionsFormToPayload", () => {
  it("trims, de-duplicates and keeps the submitted codes", () => {
    expect(rolePermissionsFormToPayload(form([" products.view ", "products.view", "orders.view"]))).toEqual({
      permissionCodes: ["products.view", "orders.view"],
    });
  });

  it("returns an empty set when nothing is ticked", () => {
    expect(rolePermissionsFormToPayload(form([]))).toEqual({ permissionCodes: [] });
    expect(rolePermissionsFormToPayload(form(["   "]))).toEqual({ permissionCodes: [] });
  });
});
