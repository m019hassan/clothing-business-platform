#!/usr/bin/env node
/**
 * Creates (or updates) the Admin role with every permission defined in the code
 * and attaches it to an admin account, so the owner can manage everything from
 * the UI.
 *
 * Usage:
 *   npm run make-admin                                   # admin@example.com / Admin12345!
 *   npm run make-admin -- --email me@x.com --password '***'
 *   npm run make-admin -- --email me@x.com --branch FACTORY
 *
 * The permission list is read from modules/auth/application/permissions.ts, which
 * stays the single source of truth.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import bcrypt from "bcryptjs";
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

function readPermissionCodes() {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "modules", "auth", "application", "permissions.ts"), "utf8");
  const codes = [...source.matchAll(/:\s*"([a-z]+\.[a-z.]+)"/g)].map((match) => match[1]);

  if (codes.length === 0) {
    throw new Error("No permission codes were found in modules/auth/application/permissions.ts.");
  }

  return [...new Set(codes)];
}

loadEnvFile();

const args = parseArgs(process.argv.slice(2));
const email = (args.email ?? "admin@example.com").toString().toLowerCase();
const password = (args.password ?? "Admin12345!").toString();
const userName = (args.name ?? "Platform Admin").toString();
const branchCode = args.branch ? args.branch.toString().toUpperCase() : null;

if (password.length < 8) {
  console.error("\n✖ The password must be at least 8 characters long.\n");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const codes = readPermissionCodes();

  const role = await prisma.role.upsert({
    where: { code: "ADMIN" },
    create: { code: "ADMIN", name: "Admin", description: "Full access (maintained by scripts/make-admin.mjs)", isSystem: true, isActive: true },
    update: { name: "Admin", isActive: true },
    select: { id: true },
  });

  const permissions = [];
  for (const code of codes) {
    const [moduleName] = code.split(".");
    permissions.push(
      await prisma.permission.upsert({
        where: { code },
        create: { code, name: code, module: moduleName, description: code, isActive: true },
        update: { isActive: true },
        select: { id: true },
      }),
    );
  }

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  });

  const department = await prisma.department.upsert({
    where: { code: "ADMIN" },
    create: { code: "ADMIN", name: "Administration" },
    update: {},
    select: { id: true },
  });

  const branch = branchCode
    ? await prisma.branch.findUnique({ where: { code: branchCode }, select: { id: true } })
    : null;

  if (branchCode && !branch) {
    console.error(`\n✖ Branch ${branchCode} was not found.\n`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const phone = (args.phone ?? "+966500000099").toString();

  const account = await prisma.account.upsert({
    where: { email },
    create: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email,
      phone,
      passwordHash,
      emailVerified: true,
      employeeProfile: {
        create: {
          employeeNumber: `ADMIN-${Date.now().toString(36).toUpperCase()}`,
          departmentId: department.id,
          firstName: userName,
          jobTitle: "Administrator",
          branchId: branch?.id ?? null,
        },
      },
    },
    update: { passwordHash, status: "ACTIVE", failedLoginAttempts: 0, lockedUntil: null },
    select: { id: true, employeeProfile: { select: { id: true } } },
  });

  if (!account.employeeProfile) {
    console.error("\n✖ This email already belongs to a non-employee account.\n");
    process.exit(1);
  }

  const existingRole = await prisma.employeeRole.findFirst({
    where: { employeeId: account.employeeProfile.id, roleId: role.id },
  });

  if (!existingRole) {
    await prisma.employeeRole.create({ data: { employeeId: account.employeeProfile.id, roleId: role.id } });
  }

  console.log(`\n✔ Admin ready`);
  console.log(`  email:       ${email}`);
  console.log(`  password:    ${args.password ? "(as provided)" : password}`);
  console.log(`  permissions: ${permissions.length}`);
  console.log(`  branch:      ${branch ? branchCode : "(none)"}\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(`\n✖ make-admin failed: ${String(error.message ?? error)}`);
    await prisma.$disconnect();
    process.exit(1);
  });
