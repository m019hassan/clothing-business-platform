/**
 * Minimal in-memory rate limiter (fixed window).
 *
 * It protects a single process, which is the current deployment shape. A
 * multi-instance deployment needs a shared store (documented as a follow-up in
 * docs/04-security/authentication.md).
 */
export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxKeys?: number;
};

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;
  private readonly maxKeys: number;
  private readonly windows = new Map<string, Window>();

  constructor(options: RateLimiterOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      throw new Error("RateLimiter limit must be a positive integer.");
    }

    if (!Number.isFinite(options.windowMs) || options.windowMs < 1) {
      throw new Error("RateLimiter windowMs must be a positive number.");
    }

    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? Date.now;
    this.maxKeys = options.maxKeys ?? 10000;
  }

  /** Reads the current state of a key without consuming anything. */
  check(key: string): RateLimitDecision {
    const window = this.windows.get(key);
    const now = this.now();

    if (!window || window.resetAt <= now) {
      return { allowed: true, remaining: this.limit, retryAfterMs: 0 };
    }

    const remaining = Math.max(this.limit - window.count, 0);

    return {
      allowed: remaining > 0,
      remaining,
      retryAfterMs: remaining > 0 ? 0 : window.resetAt - now,
    };
  }

  /**
   * Consumes one unit for the key. The returned decision describes *this*
   * request: `allowed` is true when the call was admitted, and `remaining`
   * counts the attempts left in the window afterwards.
   */
  consume(key: string): RateLimitDecision {
    const decision = this.check(key);

    if (!decision.allowed) {
      return decision;
    }

    const now = this.now();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      this.evictIfNeeded();
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      current.count += 1;
    }

    const window = this.windows.get(key) as Window;

    return {
      allowed: true,
      remaining: Math.max(this.limit - window.count, 0),
      retryAfterMs: 0,
    };
  }

  /** Clears a key (used after a successful login). */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /** Clears every window (used by tests and by administrative tooling). */
  clear(): void {
    this.windows.clear();
  }

  private evictIfNeeded(): void {
    if (this.windows.size < this.maxKeys) {
      return;
    }

    const now = this.now();

    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) {
        this.windows.delete(key);
      }
    }

    if (this.windows.size >= this.maxKeys) {
      // Still full: drop the oldest entries so memory stays bounded.
      const overflow = this.windows.size - this.maxKeys + 1;
      let dropped = 0;

      for (const key of this.windows.keys()) {
        this.windows.delete(key);
        dropped += 1;

        if (dropped >= overflow) {
          break;
        }
      }
    }
  }
}
