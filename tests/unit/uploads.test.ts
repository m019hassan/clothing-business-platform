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

describe("upload keys", () => {
  it("reads back nothing for keys that could escape the root", async () => {
    const { readUpload } = await import("@/src/lib/storage");

    expect(await readUpload("../../etc/passwd")).toBeNull();
    expect(await readUpload("..%2F..%2Fetc%2Fpasswd")).toBeNull();
    expect(await readUpload("not-a-uuid.png")).toBeNull();
  });

  it("keeps the filesystem driver when nothing asks for object storage", async () => {
    const { mkdtemp, readFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    process.env.UPLOAD_DIR = await mkdtemp(join(tmpdir(), "cbp-picker-"));
    delete process.env.STORAGE_DRIVER;

    const { saveUpload, readUpload } = await import("@/src/lib/storage");
    const saved = await saveUpload({ data: Buffer.from("pick me"), contentType: "image/png", originalName: "p.png" });

    expect(saved.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect((await readFile(join(process.env.UPLOAD_DIR, saved.key))).toString()).toBe("pick me");
    expect((await readUpload(saved.key))?.toString()).toBe("pick me");

    delete process.env.UPLOAD_DIR;
  });
});
