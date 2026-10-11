/**
 * Idempotent: makes sure the products.cost.view permission exists and that the
 * ADMIN role holds it. Safe to run repeatedly, on any environment:
 *
 *   node scripts/ensure-cost-permission.mjs
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
  where: { code: "products.cost.view" },
  update: { name: "View product cost and profit", module: "products", isActive: true },
  create: {
    code: "products.cost.view",
    name: "View product cost and profit",
    module: "products",
    description: "Lets an account see product cost prices and open the profit report.",
  },
});

const admin = await prisma.role.findUnique({ where: { code: "ADMIN" } });

if (admin) {
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: admin.id, permissionId: permission.id } },
    update: {},
    create: { roleId: admin.id, permissionId: permission.id },
  });
  console.log("products.cost.view ✓ granted to ADMIN");
} else {
  console.log("products.cost.view ✓ created (no ADMIN role in this database)");
}

await prisma.$disconnect();
