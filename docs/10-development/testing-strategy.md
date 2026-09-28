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

## Local database connections

The suite runs against the PostgreSQL 16 instance created by roadmap item A1 and
uses `TEST_DATABASE_URL` (see `local-database.md`), so it never touches development
data. The pool cap that the old embedded proxy required (`connection_limit=2`) is
only applied when `TEST_DATABASE_URL` is absent.

### Tests own their data

A test file must create the reference rows it needs instead of assuming an
accumulated development database:

- `FACTORY` branch, `MAIN` warehouse, `RETAIL` classification and `OPS` department
  are created on demand with a `findFirst ?? create` pattern.
- Identifiers derived from a value must stay unique per run and per fixture row;
  two branches created in the same millisecond share the timestamp prefix of their
  codes, so anything truncated to `VarChar(20)` (walk-in phones, for example) has
  to be derived from the row id instead.
- Page-size assertions are written against `pagination.total`
  (`Math.min(limit, total)`), never against a fixed number of rows.

These rules came out of the move to a clean database: the three tests that broke
had been relying on data the embedded database had accumulated.

## Concurrency

`tests/integration/concurrency.test.ts` exercises the stock guards with genuinely
parallel requests (a real connection pool, not a serialized embedded server):

| Scenario | Guaranteed outcome |
| --- | --- |
| six carts race for three units | exactly three reserve, three get `409`, and the reservation ledger holds three rows |
| approval and rejection race on one payment | exactly one settles the order, the loser gets `409`, and stock moves once |
| four terminals race for two units | exactly two sell, two get `409`, and the branch keeps exactly one walk-in buyer |

Two real defects surfaced while writing them, both fixed:

1. **Walk-in buyer creation was not atomic.** Two terminals at the same branch
   could pass the lookup and then collide on the deterministic unique phone, and
   the loser failed with a unique-constraint error instead of reusing the buyer.
   `ensureWalkInProfile` now upserts on that phone.
2. **A lost race failed a legitimate request.** The guarded `updateMany` fails when
   another transaction touched the row after it was read, even when stock was still
   available. `reserveStock` and `sellStock` now re-read and retry (three attempts,
   tracking the units still pending) while the guard remains the ceiling; selling
   also compares `quantityReserved`, so a concurrent reservation cannot push
   on-hand below the reserved amount.
