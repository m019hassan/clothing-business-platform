// Loads .env before any module that reads DATABASE_URL / AUTH_SECRET.
import "dotenv/config";

import { afterAll } from "vitest";

/**
 * The suite runs against TEST_DATABASE_URL so a test run can never touch
 * development data. When that variable is absent the tests fall back to
 * DATABASE_URL, and in that case the local `prisma dev` (pglite) ceiling of ~9
 * simultaneous connections still applies, so the pool is capped.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("connection_limit=")) {
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}&connection_limit=2`;
}

import { prisma } from "@/src/lib/db";

/**
 * Every test file releases its client when it finishes instead of leaving one
 * behind for the whole run.
 */
afterAll(async () => {
  await prisma.$disconnect().catch(() => undefined);
});
