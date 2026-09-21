# Authentication

## Authentication approach
The platform should use secure, modern authentication with support for email/password initially and optional social or enterprise identity providers later.

## MVP requirements
- Secure password hashing
- Session management
- Password reset flow
- Role-based access after login

## Recommended approach
- Use a proven authentication library or provider rather than custom session logic.
- Keep authentication concerns in a dedicated module.
- Use secure cookies or token-based sessions depending on deployment needs.

## Security notes
- Multi-factor authentication should be considered for administrators.
- Failed login attempts should be rate-limited.
- Login events should be auditable.

## Rate limiting and lockout

Two layers protect the sign-in path:

1. **Account lockout** (existing): five consecutive failed attempts lock the
   account for 15 minutes (`Account.failedLoginAttempts` / `lockedUntil`).
2. **Windowed rate limiting** (`src/lib/rate-limit.ts`, applied in
   `modules/auth/application/login.ts`):
   - per identifier: 5 attempts / 15 minutes
   - per client: 20 attempts / 15 minutes, keyed by `x-forwarded-for` (falling
     back to `x-real-ip`, then `unknown`)
   - every failed attempt counts, including unknown identifiers, and a successful
     sign-in clears the identifier window (the client window stays).

Blocked attempts fail with HTTP 429 / `RATE_LIMITED` and a message that includes
the wait time; the API error body carries `retryAfterSeconds` when available.

Limitation: the limiter is in-process memory, so it protects one instance. A
multi-instance deployment needs a shared store (Redis or the database) — that is
a follow-up, not implemented here.
