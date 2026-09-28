import { describe, expect, it } from "vitest";

import { ApiError, apiErrorMessage, type ApiErrorLabels } from "@/src/lib/api";

const labels: ApiErrorLabels = {
  rateLimited: "محاولات كثيرة.",
  validation: "تحقق من القيم.",
  authentication: "انتهت الجلسة.",
  authorization: "لا صلاحية.",
  notFound: "غير متاح.",
  conflict: "تغيّرت البيانات.",
  database: "الخدمة غير متاحة.",
  internal: "خطأ ما.",
};

describe("apiErrorMessage", () => {
  it("translates by the stable error code when labels are provided", () => {
    expect(apiErrorMessage(new ApiError(409, "CONFLICT", "Stock changed."), labels)).toBe("تغيّرت البيانات.");
    expect(apiErrorMessage(new ApiError(404, "NOT_FOUND", "Gone."), labels)).toBe("غير متاح.");
    expect(apiErrorMessage(new ApiError(403, "AUTHORIZATION_ERROR", "Nope."), labels)).toBe("لا صلاحية.");
    expect(apiErrorMessage(new ApiError(401, "AUTHENTICATION_ERROR", "Sign in."), labels)).toBe("انتهت الجلسة.");
    expect(apiErrorMessage(new ApiError(429, "RATE_LIMITED", "Slow down."), labels)).toBe("محاولات كثيرة.");
  });

  it("uses the generic validation sentence instead of the English field detail", () => {
    expect(apiErrorMessage(new ApiError(400, "VALIDATION_ERROR", "Unknown field(s): x."), labels)).toBe("تحقق من القيم.");
  });

  it("falls back to the server message when labels are missing", () => {
    expect(apiErrorMessage(new ApiError(400, "VALIDATION_ERROR", "Unknown field(s): x."))).toBe("Unknown field(s): x.");
    expect(apiErrorMessage(new ApiError(409, "CONFLICT", "Stock changed."))).toBe(
      "Some items are no longer available in the requested quantity. Please review your cart.",
    );
  });

  it("handles an unknown failure shape", () => {
    expect(apiErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
    expect(apiErrorMessage(new Error("boom"), labels)).toBe("خطأ ما.");
    expect(apiErrorMessage(new ApiError(500, "UNKNOWN", "boom"), labels)).toBe("خطأ ما.");
  });
});
