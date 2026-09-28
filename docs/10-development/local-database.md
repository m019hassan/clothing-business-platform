# Local database (PostgreSQL 16)

Roadmap item A1 replaced the embedded `prisma dev` (pglite) database with a real
PostgreSQL 16, because the embedded server accepted **at most 9 simultaneous
connections** and kept dropping the tenth client while the suite, the app server
and Studio were running together. PostgreSQL's default is 100.

## Install and run

```bash
brew install postgresql@16          # already done on this machine (16.15)

# start / stop manually (no launchd service is registered)
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/postgresql@16/server.log start
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 stop
```

`brew services start postgresql@16` would additionally start it at login; that is
a deliberate opt-in, not part of the setup.

## Roles and databases

| Database | Used by | Owner |
| --- | --- | --- |
| `clothing_platform` | application and manual checks (`DATABASE_URL`) | `clothing` |
| `clothing_platform_test` | `npm test` (`TEST_DATABASE_URL`) | `clothing` |

The role is `clothing` (with `CREATEDB`, which Prisma needs for a shadow database),
the password lives in `.env` only. The suite reads `TEST_DATABASE_URL` and points
`DATABASE_URL` at it for the duration of the run, so **a test run cannot touch
development data**; without that variable it falls back to `DATABASE_URL`.

## Baseline data

A freshly migrated database has no reference data, and the application needs some
of it to work at all (the inventory module resolves the `MAIN` warehouse, POS the
`RETAIL` classification, `employees` defaults to `RETAIL`/`OPS`, and a product
needs a category):

```bash
npm run bootstrap        # idempotent: branch FACTORY, warehouse MAIN, classifications,
                         # department OPS, category General
npm run make-admin -- --email you@example.com --password '…' --branch FACTORY --phone +966500000098
```

`make-admin` reads the permission codes from `modules/auth/application/permissions.ts`,
so the `ADMIN` role always carries every code the code defines (29 today).
`--phone` must be unique across accounts; the default collides with the seeded
`admin@example.com`.

## Migrations

```bash
npx prisma@6.19.3 migrate deploy      # applies to DATABASE_URL
DATABASE_URL="$TEST_DATABASE_URL" npx prisma@6.19.3 migrate deploy   # and to the test database
npx prisma@6.19.3 migrate dev --name <change>   # now works: the shadow database is allowed
```

With a real PostgreSQL, `migrate dev` is usable again (it was not through the
embedded proxy, which is why the earlier migrations were authored with
`migrate diff --script` plus `migrate deploy`).
