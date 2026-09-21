import { describe, expect, it } from "vitest";

import { RateLimiter } from "@/src/lib/rate-limit";

function fakeClock(start = 1_000_000) {
  let current = start;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("RateLimiter", () => {
  it("allows up to the limit and then blocks with a retry hint", () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume("k")).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = limiter.consume("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(60_000);
    expect(limiter.check("k").allowed).toBe(false);
  });

  it("reports the retry window counting down over time", () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.consume("k");
    clock.advance(20_000);

    expect(limiter.consume("k").retryAfterMs).toBe(40_000);

    clock.advance(40_000);
    expect(limiter.consume("k").allowed).toBe(true);
  });

  it("keeps keys isolated", () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.consume("a");

    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("resets a single key and clears everything", () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.consume("a");
    limiter.consume("b");
    limiter.reset("a");

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(false);

    limiter.clear();
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("validates its configuration", () => {
    expect(() => new RateLimiter({ limit: 0, windowMs: 1000 })).toThrowError();
    expect(() => new RateLimiter({ limit: 1, windowMs: 0 })).toThrowError();
  });
});
