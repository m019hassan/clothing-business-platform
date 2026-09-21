# Security Requirements

## MVP security requirements
- Enforce authentication for protected routes and API actions.
- Enforce authorization at the application service layer.
- Encrypt sensitive data at rest and in transit.
- Protect payment proof files and audit logs.
- Rate limit authentication and sensitive operations.
- Keep secrets in environment-based secret storage.

## Risks to plan for
- Unauthorized access to admin functionality
- Inventory overselling due to race conditions
- Fraudulent bank transfer proof uploads
- AI prompt injection and unsafe tool execution
- Accidental deletion or modification of critical records

## Controls
- Permission checks
- Transaction boundaries
- Audit logs
- Idempotency for critical operations
- Approval workflow for high-risk actions

## Security headers (implemented)

Applied to every response from `next.config.ts`:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'` with `script-src 'self' 'unsafe-inline'` (`'unsafe-eval'` only outside production), `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `form-action 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation and payment disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production only) |

`X-Powered-By` is disabled. The CSP keeps `'unsafe-inline'` because Next injects
its hydration bootstrap inline; a nonce-based policy is the next hardening step.
