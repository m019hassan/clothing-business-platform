#!/usr/bin/env node
/**
 * Account seeding for local development.
 *
 * Usage:
 *   npm run seed -- --email user@example.com --password "Secret123" [options]
 *   npm run seed -- --list
 *
 * Common options:
 *   --type customer|employee      (default: customer)
 *   --phone +966500000000         (unique phone, required by the Account model)
 *   --first Ahmed --last Ali      (profile names)
 *   --classification RETAIL       (customer classification code, created if missing)
 *   --department OPS              (employee department code, created if missing)
 *   --role order_manager          (attach an existing role to an employee)
 *   --update-password             (reset the password of an existing account)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Minimal .env loader so the script works without extra dependencies.
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
      // file missing — rely on the process environment
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

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function generateCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set. Create a .env file (see .env.example).");
}

const prisma = new PrismaClient();
const args = parseArgs(process.argv.slice(2));

async function listAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      accountType: true,
      status: true,
      email: true,
      phone: true,
      customerProfile: { select: { customerCode: true } },
      employeeProfile: { select: { employeeNumber: true } },
    },
  });

  console.log(`\n${accounts.length} account(s):\n`);
  for (const account of accounts) {
    const code = account.customerProfile?.customerCode ?? account.employeeProfile?.employeeNumber ?? "—";
    console.log(
      `  ${account.accountType.padEnd(8)} ${account.status.padEnd(9)} ${(account.email ?? account.phone).padEnd(32)} ${code}`,
    );
  }
  console.log("");
}

async function createAccount() {
  const type = (args.type ?? "customer").toString().toLowerCase();
  if (type !== "customer" && type !== "employee") {
    fail('--type must be "customer" or "employee".');
  }

  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : null;
  const password = typeof args.password === "string" ? args.password : null;
  let phone = typeof args.phone === "string" ? args.phone.trim() : null;

  if (!email && !phone) fail("Provide at least --email or --phone.");
  if (!password) fail("Provide --password (minimum 8 characters).");
  if (password.length < 8) fail("The password must be at least 8 characters long.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("The email address is not valid.");
  if (!phone) phone = `+9665${Math.floor(10000000 + Math.random() * 89999999)}`;

  const existing = await prisma.account.findFirst({
    where: { OR: [email ? { email } : undefined, { phone }].filter(Boolean) },
    select: { id: true, email: true, phone: true },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing && args["update-password"]) {
    await prisma.account.update({ where: { id: existing.id }, data: { passwordHash } });
    console.log(`\n✔ Password updated for ${existing.email ?? existing.phone}\n`);
    return;
  }

  if (existing) {
    fail(
      `An account with this email or phone already exists (${existing.email ?? existing.phone}). ` +
        "Use --update-password to reset its password.",
    );
  }

  const firstName = typeof args.first === "string" ? args.first : "New";
  const lastName = typeof args.last === "string" ? args.last : type === "employee" ? "Employee" : "Customer";

  if (type === "customer") {
    const classificationCode = (typeof args.classification === "string" ? args.classification : "RETAIL").toUpperCase();
    const classification =
      (await prisma.customerClassification.findFirst({ where: { code: classificationCode } })) ??
      (await prisma.customerClassification.create({
        data: { code: classificationCode, name: classificationCode.charAt(0) + classificationCode.slice(1).toLowerCase() },
      }));

    const account = await prisma.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email,
        phone,
        passwordHash,
        customerProfile: {
          create: {
            customerCode: generateCode("C"),
            classificationId: classification.id,
            firstName,
            lastName,
          },
        },
      },
      select: { id: true, email: true, phone: true, customerProfile: { select: { customerCode: true } } },
    });

    console.log(`\n✔ Customer account created`);
    console.log(`  email:    ${account.email ?? "—"}`);
    console.log(`  phone:    ${account.phone}`);
    console.log(`  password: (as provided)`);
    console.log(`  code:     ${account.customerProfile?.customerCode}\n`);
    return;
  }

  const departmentCode = (typeof args.department === "string" ? args.department : "OPS").toUpperCase();
  const department =
    (await prisma.department.findFirst({ where: { code: departmentCode } })) ??
    (await prisma.department.create({
      data: { code: departmentCode, name: departmentCode.charAt(0) + departmentCode.slice(1).toLowerCase() },
    }));

  const account = await prisma.account.create({
    data: {
      accountType: "EMPLOYEE",
      status: "ACTIVE",
      email,
      phone,
      passwordHash,
      employeeProfile: {
        create: {
          employeeNumber: generateCode("E"),
          departmentId: department.id,
          firstName,
          lastName,
        },
      },
    },
    select: { id: true, email: true, phone: true, employeeProfile: { select: { id: true, employeeNumber: true } } },
  });

  let roleNote = "no role attached (employee will have no permissions until a role is assigned)";
  if (typeof args.role === "string") {
    const role = await prisma.role.findFirst({ where: { code: args.role } });

    if (!role) {
      roleNote = `role "${args.role}" not found — no role attached`;
    } else if (account.employeeProfile) {
      await prisma.employeeRole.create({
        data: { employeeId: account.employeeProfile.id, roleId: role.id },
      });
      roleNote = `role "${role.code}" attached`;
    }
  }

  console.log(`\n✔ Employee account created`);
  console.log(`  email:    ${account.email ?? "—"}`);
  console.log(`  phone:    ${account.phone}`);
  console.log(`  password: (as provided)`);
  console.log(`  number:   ${account.employeeProfile?.employeeNumber}`);
  console.log(`  ${roleNote}\n`);
}

try {
  if (args.list) {
    await listAccounts();
  } else {
    await createAccount();
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await prisma.$disconnect();
}
