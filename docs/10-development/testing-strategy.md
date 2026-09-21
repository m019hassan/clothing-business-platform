# Testing Strategy

## Test levels
- Unit tests for validation and simple business rules
- Integration tests for order, payment, and inventory flows
- End-to-end tests for critical user journeys

## Priority areas
- Inventory reservation and release
- Bank transfer verification flow
- Order cancellation and return flow
- Permission enforcement
- AI tool execution and approval workflow

## Test principles
- Prefer testing real behavior over mocks where possible.
- Include failure cases for permission denial and invalid state transitions.

## Local database connections (`prisma dev`)

The local development database runs through `prisma dev` (an embedded Postgres).
Measurements on this machine: it accepts **at most 9 simultaneous connections** —
the tenth client fails with `Can't reach database server at localhost:51214`. A
Prisma client holds its pool for as long as the process lives, so the test suite
is the first thing to break when several pools compete (test workers plus the
Next.js server plus Prisma Studio).

Mitigations in place:
- `tests/setup.ts` disconnects the client in `afterAll`, so each test file
  releases its connection instead of keeping one for the whole run.
- Stop Prisma Studio (`lsof -ti tcp:5555 | xargs kill`) or the app server while
  running the whole suite when the database misbehaves.
- If the server still drops connections, restart it:
  `npx prisma@6.19.3 dev stop cbp-local && npx prisma@6.19.3 dev start cbp-local`

The durable fix is roadmap item A1: move development to a real Postgres 16
instance (default `max_connections` is 100), which also enables `psql` and the
multi-connection concurrency test planned in H1.
