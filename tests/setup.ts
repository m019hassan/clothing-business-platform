// Loads .env before any module that reads DATABASE_URL / AUTH_SECRET.
import "dotenv/config";

import { afterAll } from "vitest";

/**
 * The local `prisma dev` server accepts only ~9 simultaneous connections, while a
 * Prisma client opens up to ten by default. Capping the pool per client keeps the
 * whole suite (and any app server running next to it) inside that ceiling; the
 * cap only applies to the test process, never to the application runtime.
 */
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("connection_limit=")) {
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
