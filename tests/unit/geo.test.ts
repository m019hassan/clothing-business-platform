import { describe, expect, it } from "vitest";

import { mapNominatimResult } from "@/modules/checkout/application/geo";

describe("mapNominatimResult", () => {
  it("builds the street from the road and number and takes the city from the hit", () => {
    const suggestion = mapNominatimResult({
      display_name: "شارع العليا، الرياض، السعودية",
      address: { road: "شارع العليا", house_number: "12", city: "الرياض", state: "منطقة الرياض", postcode: "12211" },
    });

    expect(suggestion.line1).toBe("شارع العليا 12");
    expect(suggestion.city).toBe("الرياض");
    expect(suggestion.region).toBe("منطقة الرياض");
    expect(suggestion.postalCode).toBe("12211");
  });

  it("falls back to the neighbourhood and the first display part", () => {
    const suggestion = mapNominatimResult({
      display_name: "حي النرجس، الرياض، السعودية",
      address: { neighbourhood: "حي النرجس" },
    });

    expect(suggestion.line1).toBe("حي النرجس");
    expect(suggestion.label).toContain("الرياض");
  });
});
