/**
 * Idempotent development baseline.
 *
 * A fresh database has no reference data, and the application requires some of it
 * to boot at all: `modules/inventory` resolves the MAIN warehouse, `modules/pos`
 * the RETAIL classification, `modules/users` defaults to RETAIL / OPS, and a
 * product needs a category. The codes below are the ones the codebase and
 * docs/05-database/erd.md already name; nothing new is invented here.
 *
 *   npm run bootstrap
 *
 * Safe to run repeatedly: every row is upserted by its unique code.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (existsSync(join(root, ".env"))) {
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);

    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}

const prisma = new PrismaClient();

// Coding conventions already used by the application (see the module references above).
const CLASSIFICATIONS = [
  { code: "RETAIL", name: "Retail", description: "Individual retail customers." },
  { code: "WHOLESALE", name: "Wholesale", description: "Wholesale buyers." },
  { code: "DISTRIBUTOR", name: "Distributor", description: "Distributors who resell the products." },
  { code: "CORPORATE", name: "Corporate", description: "Corporate accounts." },
  { code: "VIP", name: "VIP", description: "High-value customers." },
];
const DEPARTMENT = { code: "OPS", name: "Operations", description: "Default department for staff accounts." };
const BRANCH = { code: "FACTORY", name: "Factory", city: "Riyadh" };
const WAREHOUSE = { code: "MAIN", name: "Main Store" };
const CATEGORY = { slug: "general", name: "General" };

async function main() {
  const created = [];

  for (const classification of CLASSIFICATIONS) {
    const existing = await prisma.customerClassification.findUnique({ where: { code: classification.code } });

    if (existing) {
      continue;
    }

    await prisma.customerClassification.create({ data: classification });
    created.push(`customer classification ${classification.code}`);
  }

  const department = await prisma.department.upsert({
    where: { code: DEPARTMENT.code },
    update: {},
    create: DEPARTMENT,
  });

  const branch = await prisma.branch.upsert({
    where: { code: BRANCH.code },
    update: {},
    create: BRANCH,
  });

  const warehouse = await prisma.warehouse.findFirst({ where: { code: WAREHOUSE.code } });

  if (warehouse) {
    if (!warehouse.branchId) {
      await prisma.warehouse.update({ where: { id: warehouse.id }, data: { branchId: branch.id } });
      created.push(`linked warehouse ${WAREHOUSE.code} to branch ${BRANCH.code}`);
    }
  } else {
    await prisma.warehouse.create({ data: { ...WAREHOUSE, branchId: branch.id } });
    created.push(`warehouse ${WAREHOUSE.code}`);
  }

  const category = await prisma.category.findFirst({ where: { slug: CATEGORY.slug } });

  if (!category) {
    await prisma.category.create({ data: CATEGORY });
    created.push(`category ${CATEGORY.name}`);
  }

  console.log(`\n✔ Baseline ready (branch ${branch.code}, warehouse ${WAREHOUSE.code}, department ${department.code})`);

  if (created.length > 0) {
    console.log(`  created: ${created.join(", ")}\n`);
  } else {
    console.log("  nothing to create; the baseline was already complete.\n");
  }

  console.log('Next: npm run make-admin -- --email you@example.com --branch FACTORY\n');
}

main()
  .catch((error) => {
    console.error("\n✖ Bootstrap failed:", error instanceof Error ? error.message : error, "\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
