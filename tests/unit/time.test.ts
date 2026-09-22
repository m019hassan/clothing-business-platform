import { describe, expect, it } from "vitest";

import { startOfDayInTimeZone, startOfMonthInTimeZone, timezoneOffsetMinutes } from "@/src/lib/time";

describe("timezone boundaries", () => {
  it("reads the zone offset at the reference instant", () => {
    const instant = new Date("2026-09-22T12:00:00.000Z");

    expect(timezoneOffsetMinutes("UTC", instant)).toBe(0);
    expect(timezoneOffsetMinutes("Asia/Riyadh", instant)).toBe(180);
    expect(timezoneOffsetMinutes("America/New_York", instant)).toBe(-240);
  });

  it("computes local midnight as a UTC instant", () => {
    // 09:00 UTC on 2026-09-22 is midday in Riyadh (+03:00).
    const instant = new Date("2026-09-22T09:00:00.000Z");

    expect(startOfDayInTimeZone("UTC", instant).toISOString()).toBe("2026-09-22T00:00:00.000Z");
    expect(startOfDayInTimeZone("Asia/Riyadh", instant).toISOString()).toBe("2026-09-21T21:00:00.000Z");
    expect(startOfDayInTimeZone("America/New_York", instant).toISOString()).toBe("2026-09-22T04:00:00.000Z");
  });

  it("stays on the same local day just after local midnight", () => {
    // 21:30 UTC = 00:30 next day in Riyadh, so "today" there is the 22nd.
    const instant = new Date("2026-09-21T21:30:00.000Z");

    expect(startOfDayInTimeZone("Asia/Riyadh", instant).toISOString()).toBe("2026-09-21T21:00:00.000Z");
    expect(startOfDayInTimeZone("UTC", instant).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("computes the first day of the local month", () => {
    const instant = new Date("2026-09-22T09:00:00.000Z");

    expect(startOfMonthInTimeZone("UTC", instant).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(startOfMonthInTimeZone("Asia/Riyadh", instant).toISOString()).toBe("2026-08-31T21:00:00.000Z");
  });
});
