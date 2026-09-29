import { afterEach, describe, expect, it } from "vitest";

import { apiRequest } from "@/src/lib/api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function captureFetch() {
  const calls: { url: string; init: RequestInit | undefined }[] = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return calls;
}

describe("apiRequest", () => {
  it("labels a JSON body as JSON", async () => {
    const calls = captureFetch();

    await apiRequest("/api/payments/1/verify", { method: "POST", body: JSON.stringify({ reason: "x" }) });

    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("leaves a FormData body without a JSON content type", async () => {
    const calls = captureFetch();
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "photo.png");

    await apiRequest("/api/products/1/images", { method: "POST", body: form });

    const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(calls[0].init?.body).toBe(form);
  });

  it("still throws a typed error for a failed request", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { code: "CONFLICT", message: "Already used." } }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    await expect(apiRequest("/api/x", { method: "POST", body: "{}" })).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });
});
