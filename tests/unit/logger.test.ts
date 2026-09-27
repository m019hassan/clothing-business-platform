import { afterEach, describe, expect, it, vi } from "vitest";

import { ConflictError, NotFoundError, toErrorResponse } from "@/src/lib/errors";
import { logger } from "@/src/lib/logger";

function captureConsole() {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((value: string) => lines.push(value));
  const warnSpy = vi.spyOn(console, "warn").mockImplementation((value: string) => lines.push(value));
  const errorSpy = vi.spyOn(console, "error").mockImplementation((value: string) => lines.push(value));

  return {
    lines,
    restore: () => {
      spy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

const originalLevel = process.env.LOG_LEVEL;

afterEach(() => {
  process.env.LOG_LEVEL = originalLevel;
});

describe("logger", () => {
  it("writes one JSON line per record with level, time and context", () => {
    process.env.LOG_LEVEL = "debug";
    const capture = captureConsole();

    logger.info("something happened", { orderId: "abc" });
    capture.restore();

    expect(capture.lines).toHaveLength(1);
    const parsed = JSON.parse(capture.lines[0]);
    expect(parsed).toMatchObject({ level: "info", message: "something happened", orderId: "abc" });
    expect(Date.parse(parsed.time)).not.toBeNaN();
  });

  it("drops records below the configured threshold", () => {
    process.env.LOG_LEVEL = "warn";
    const capture = captureConsole();

    logger.debug("noise");
    logger.info("also noise");
    logger.warn("kept");
    capture.restore();

    expect(capture.lines).toHaveLength(1);
    expect(JSON.parse(capture.lines[0]).message).toBe("kept");
  });

  it("redacts sensitive keys and serialises errors", () => {
    process.env.LOG_LEVEL = "debug";
    const capture = captureConsole();

    logger.error("failed", { password: "***", refreshToken: "abc", cause: new Error("boom") });
    capture.restore();

    const parsed = JSON.parse(capture.lines[0]);
    expect(parsed.password).toBe("[redacted]");
    expect(parsed.refreshToken).toBe("[redacted]");
    expect(parsed.cause).toEqual({ name: "Error", message: "boom" });
  });
});

describe("toErrorResponse", () => {
  it("returns the code and message for client mistakes without an error id", () => {
    process.env.LOG_LEVEL = "error";
    const capture = captureConsole();

    const response = toErrorResponse(new NotFoundError("Order not found."));
    capture.restore();

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND", message: "Order not found." });
    expect(response.body.error.errorId).toBeUndefined();
    expect(capture.lines).toHaveLength(0);
  });

  it("attaches a correlation id to server failures and logs the detail", () => {
    process.env.LOG_LEVEL = "debug";
    const capture = captureConsole();

    const response = toErrorResponse(new Error("connection exploded"));
    capture.restore();

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.body.error.errorId).toMatch(/^[0-9a-f]{12}$/);

    const logged = capture.lines.map((line) => JSON.parse(line));
    const failure = logged.find((line) => line.errorId === response.body.error.errorId);
    expect(failure).toBeDefined();
    expect(failure.level).toBe("error");
    expect(failure.message).toBe("request failed");
    expect(failure.detail).toBe("An unexpected error occurred.");
  });

  it("warns about conflicts", () => {
    process.env.LOG_LEVEL = "debug";
    const capture = captureConsole();

    const response = toErrorResponse(new ConflictError("Stock changed."));
    capture.restore();

    expect(response.status).toBe(409);
    const logged = capture.lines.map((line) => JSON.parse(line));
    expect(logged[0]).toMatchObject({ level: "warn", code: "CONFLICT" });
  });
});
