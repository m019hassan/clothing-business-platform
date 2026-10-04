# Deploying the platform

The application is a Next.js (App Router) server with PostgreSQL and two moving parts
that a host must satisfy: a Postgres database and somewhere to keep uploaded files
(product photos and bank-transfer receipts).

## Options at a glance

| Option | Cost | Effort | Uploads | Best for |
| --- | --- | --- | --- | --- |
| Cloudflare Tunnel from the Mac | free | 10 minutes | local disk, no change | a quick trial with a few people while the Mac is on |
| Vercel + Neon + S3-compatible storage | free tiers | ~1 hour | needs `STORAGE_DRIVER=s3` | everyday use from anywhere, sharing with testers |
| Render/Railway + their Postgres | free tiers (limits) | ~1 hour | needs `STORAGE_DRIVER=s3` (no permanent disk on free) | an alternative when Vercel is not preferred |

All three keep the same code: the storage driver and the database are chosen purely by
environment variables.

## 1) Quick trial: a tunnel from the development machine

```bash
# terminal 1 - the app
npm run dev -- --port 3000
# or a production build: npm run build && npm run start -- --port 3000

# terminal 2 - a public HTTPS address (Cloudflare account, free)
brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

Share the printed `https://<random>.trycloudflare.com` link. Nothing else changes: the
database and uploads stay on the Mac, and the trial ends when the tunnel or the Mac
stops. Use it to show the platform to a handful of people before deciding on a host.

## 2) Everyday hosting: Vercel + Neon + Supabase Storage

### a. Database (Neon, free)

1. Create a Neon project (region close to the users) and copy its connection string.
2. Locally, point at it and create the schema plus the first admin:

```bash
DATABASE_URL="postgresql://…neon.tech/…?sslmode=require" npx prisma@6.19.3 migrate deploy
DATABASE_URL="postgresql://…neon.tech/…?sslmode=require" DATABASE_URL_TEST="" npm run bootstrap
DATABASE_URL="postgresql://…neon.tech/…?sslmode=require" npm run make-admin -- --phone +9665XXXXXXXX
```

`bootstrap` seeds the roles, permissions, the first branch and warehouse; `make-admin`
prints the admin credentials to sign in with.

### b. Uploads (Supabase Storage, free)

1. Create a Supabase project and a **private** bucket, e.g. `clothing-uploads`.
2. Project settings → Storage → S3 access keys: create a pair.
3. Note the S3 endpoint (`https://<project>.supabase.co/storage/v1/s3`) and the region.

Cloudflare R2 works the same way: create a bucket and an API token, then use
`S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"` and `S3_REGION="auto"`.

### c. The application (Vercel, free)

1. Import the GitHub repository at vercel.com (framework: Next.js, no changes needed).
2. Environment variables:

```
DATABASE_URL=postgresql://…neon.tech/…?sslmode=require
AUTH_SECRET=<openssl rand -hex 32>
STORAGE_DRIVER=s3
S3_BUCKET=clothing-uploads
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_REGION=…
S3_ENDPOINT=https://<project>.supabase.co/storage/v1/s3
S3_PREFIX=uploads/
```

3. Deploy. The first sign-in uses the admin account created in step (a).

## 3) A short pre-sharing checklist

- Sign in as the admin and rotate every seeded password (`/employees` → edit).
- Keep public sign-up off; create testers from `/admin` (customers) or `/employees`.
- `AUTH_SECRET` is long and private; never commit `.env`.
- The database backs up automatically on Neon/Supabase; export a dump
  (`pg_dump "$DATABASE_URL" > backup.sql`) before risky changes.
- Uploads live in the bucket, not on the host: moving hosts later keeps the files.
- `RESERVATION_TTL_HOURS` controls how long unpaid carts hold stock; adjust for your
  market.

## How the storage switch works

`src/lib/storage/index.ts` exposes two calls, `saveUpload` and `readUpload`. With
`STORAGE_DRIVER=fs` (default) they use `UPLOAD_DIR`; with `STORAGE_DRIVER=s3` they call
an S3-compatible bucket through `src/lib/storage/s3.ts`. No other module changes, and
files saved on disk earlier can be copied into the bucket with any S3 client
(`aws s3 sync .data/uploads "s3://<bucket>/uploads/" --endpoint-url …`).
