// Loads .env before any module that reads DATABASE_URL / AUTH_SECRET.
import "dotenv/config";

import { afterAll } from "vitest";

import { prisma } from "@/src/lib/db";

/**
 * The local `prisma dev` database server accepts only ~9 simultaneous
 * connections, so every test file releases its client when it finishes instead
 * of leaving one behind for the whole run.
 */
afterAll(async () => {
  await prisma.$disconnect().catch(() => undefined);
});
