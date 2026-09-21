#!/usr/bin/env node
/**
 * Reservation expiry policy.
 *
 * An ACTIVE cart that has not changed for more than the configured window is
 * considered abandoned: its reservations are released and the cart is marked
 * ABANDONED. The window defaults to RESERVATION_TTL_HOURS (48) and can be
 * overridden per run.
 *
 * Usage:
 *   npm run expire-reservations                          # apply the policy
 *   npm run expire-reservations -- --dry-run             # report only
 *   npm run expire-reservations -- --older-than-hours 6  # custom window
 *   npm run expire-reservations -- --json --quiet         # machine readable / cron
 *
 * Schedule it with cron, for example every hour:
 *   0 * * * * cd /path/to/clothing-business-platform && npm run expire-reservations -- --quiet >> /tmp/cbp-expiry.log 2>&1
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PrismaClient } from "@prisma/client";

function loadEnvFile() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");

  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(join(root, file), "utf8");

      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) continue;

        const key = match[1];
        const value = match[2].replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // missing file: rely on the process environment
    }
  }
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = argv[i + 1];

    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }

  return args;
}

loadEnvFile();

const args = parseArgs(process.argv.slice(2));
const dryRun = args["dry-run"] === true;
const quiet = args.quiet === true;
const asJson = args.json === true;
const defaultHours = Number(process.env.RESERVATION_TTL_HOURS ?? 48);
const olderThanHours = args["older-than-hours"] === undefined ? defaultHours : Number(args["older-than-hours"]);

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set. Create a .env file (see .env.example).");
}

if (!Number.isFinite(olderThanHours) || olderThanHours <= 0) {
  fail("--older-than-hours must be a positive number.");
}

const prisma = new PrismaClient();
const cutoff = new Date(Date.now() - olderThanHours * 3600_000);
const reason = `Reservation expired after ${olderThanHours}h of inactivity`;

/** Releases up to `quantity` reserved units for one variant, writing the ledger. */
async function releaseVariant(transaction, variantId, quantity) {
  const rows = await transaction.inventoryItem.findMany({
    where: { variantId, quantityReserved: { gt: 0 } },
    select: { id: true, warehouseId: true, quantityOnHand: true, quantityReserved: true },
    orderBy: { quantityReserved: "desc" },
  });

  let remaining = quantity;

  for (const row of rows) {
    if (remaining <= 0) break;

    const amount = Math.min(row.quantityReserved, remaining);
    const result = await transaction.inventoryItem.updateMany({
      where: { id: row.id, quantityReserved: { gte: amount } },
      data: { quantityReserved: { decrement: amount } },
    });

    if (result.count === 0) {
      throw new Error("Reservation state changed concurrently.");
    }

    await transaction.stockMovement.create({
      data: {
        variantId,
        warehouseId: row.warehouseId,
        type: "RELEASE",
        quantityChange: 0,
        quantityOnHandAfter: row.quantityOnHand,
        quantityReservedAfter: row.quantityReserved - amount,
        reason,
      },
    });

    remaining -= amount;
  }

  return quantity - remaining;
}

async function main() {
  const carts = await prisma.cart.findMany({
    where: { status: "ACTIVE", updatedAt: { lt: cutoff }, items: { some: {} } },
    select: {
      id: true,
      updatedAt: true,
      items: { select: { variantId: true, quantity: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  const summary = {
    mode: dryRun ? "dry-run" : "apply",
    olderThanHours,
    cutoff: cutoff.toISOString(),
    expiredCarts: carts.length,
    totalQuantity: carts.reduce(
      (sum, cart) => sum + cart.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    ),
    releasedQuantity: 0,
    warnings: [],
  };

  for (const cart of carts) {
    if (dryRun) {
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      for (const item of cart.items) {
        const released = await releaseVariant(transaction, item.variantId, item.quantity);
        summary.releasedQuantity += released;

        if (released < item.quantity) {
          summary.warnings.push(
            `Cart ${cart.id}: released ${released} of ${item.quantity} reserved units for variant ${item.variantId}.`,
          );
        }
      }

      await transaction.cart.update({ where: { id: cart.id }, data: { status: "ABANDONED" } });
    });
  }

  if (asJson) {
    if (!quiet) console.log(JSON.stringify(summary, null, 2));
  } else if (!quiet) {
    console.log(`\n${dryRun ? "DRY RUN" : "RESERVATION EXPIRY"}`);
    console.log(`  window:          ${olderThanHours}h (cutoff ${summary.cutoff})`);
    console.log(`  carts:           ${summary.expiredCarts}`);
    console.log(`  reserved units:  ${summary.totalQuantity}`);
    if (!dryRun) console.log(`  released units:  ${summary.releasedQuantity}`);
    for (const warning of summary.warnings) console.log(`  ⚠ ${warning}`);
    console.log("");
  }

  return summary;
}

main()
  .then(async (summary) => {
    await prisma.$disconnect();
    process.exit(summary.warnings.length > 0 ? 0 : 0);
  })
  .catch(async (error) => {
    console.error(`\n✖ Reservation expiry failed: ${String(error.message ?? error)}`);
    await prisma.$disconnect();
    process.exit(1);
  });
