import { describe, expect, it } from "vitest";

import { assertUploadAllowed, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/src/lib/storage";

describe("upload validation", () => {
  it("accepts the documented receipt types", () => {
    for (const type of ALLOWED_UPLOAD_TYPES) {
      expect(() => assertUploadAllowed(type, 1024)).not.toThrow();
    }
  });

  it("rejects anything else", () => {
    expect(() => assertUploadAllowed("text/html", 1024)).toThrowError(/Unsupported file type/);
    expect(() => assertUploadAllowed("application/zip", 1024)).toThrowError(/Unsupported file type/);
  });

  it("rejects empty and oversized files", () => {
    expect(() => assertUploadAllowed("application/pdf", 0)).toThrowError(/empty/);
    expect(() => assertUploadAllowed("application/pdf", MAX_UPLOAD_BYTES + 1)).toThrowError(/larger/);
  });
});
