/**
 * Idempotent: makes sure the discounts.manage permission exists and that the
 * ADMIN role holds it. Safe to run repeatedly, on any environment:
 *
 *   node scripts/ensure-discounts-permission.mjs
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

const permission = await prisma.permission.upsert({
  where: { code: "discounts.manage" },
  update: { name: "Manage discounts", module: "catalog", isActive: true },
  create: {
    code: "discounts.manage",
    name: "Manage discounts",
    module: "catalog",
    description: "Lets an account create and control time-boxed product discounts.",
  },
});

const admin = await prisma.role.findUnique({ where: { code: "ADMIN" } });

if (admin) {
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: admin.id, permissionId: permission.id } },
    update: {},
    create: { roleId: admin.id, permissionId: permission.id },
  });
  console.log("discounts.manage ✓ granted to ADMIN");
} else {
  console.log("discounts.manage ✓ created (no ADMIN role in this database)");
}

await prisma.$disconnect();
