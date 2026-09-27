# Observability

## Structured logs

`src/lib/logger.ts` writes **one JSON object per line**:

```json
{"level":"info","time":"2026-09-27T10:12:33.412Z","message":"request","requestId":"af0c0ea2-1eb","method":"GET","path":"/api/products","userAgent":"curl/8.7.1"}
```

- Threshold comes from `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, default
  `info`); anything below it is dropped before the line is written.
- `password`, `token`, `refreshToken`, `authorization`, `cookie` and `secret` keys
  are redacted automatically, and an `Error` in the context is serialised to
  `{ name, message }` instead of leaking a stack object.
- The format is line-oriented on purpose: shipping it to a collector (CloudWatch,
  Loki, Datadog…) needs no code change.

## Request ids

`proxy.ts` (Next 16's name for the middleware hook) gives every request a short
correlation id, returns it in the **`x-request-id`** response header and logs one
request line. A user reporting a problem can quote that header value.

## Error ids

`toErrorResponse` logs every rejected request exactly once:

| Case | Level | Response |
| --- | --- | --- |
| 5xx (server failure) | `error` with `errorId`, `detail`, `details` and the stack | `{ error: { code, message, errorId } }` |
| 401 / 403 / 409 | `warn` | `{ error: { code, message } }` |
| other 4xx | `debug` | `{ error: { code, message } }` |

The **error id is returned to the client only for server failures**, so a support
conversation can start from the id without the response ever exposing an internal
message, a Prisma code or a stack trace.

## Not implemented

- **External error monitoring** (Sentry or similar): no account/vendor is wired, so
  nothing reports outside the process. The error ids above are the hook to add it.
- **Log shipping** from the container to a central store.
- **Metrics/tracing** (latency percentiles, spans).
