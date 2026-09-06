# Authentication Module

Authentication owns login, logout, account status checks, session lifecycle, and password verification.

The module uses the existing `Account` and `Session` models. A custom session adapter is intentional because the project schema does not follow the user/account/session shape required by common Next.js authentication adapters; changing the schema would violate the platform's identity model.

Session tokens are random values held in an HTTP-only cookie and stored only as HMAC digests in PostgreSQL. Password verification uses `bcryptjs`. All protected pages must call `getCurrentAccount()` or `requireAuthenticatedAccount()` on the server.
