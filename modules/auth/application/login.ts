import "server-only";

import { headers } from "next/headers";
import { AccountStatus, Prisma } from "@prisma/client";

import { prisma } from "@/src/lib/db";
import {
  AuthenticationError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { createSession } from "@/modules/auth/infrastructure/session";
import { verifyPassword } from "@/modules/auth/infrastructure/password";
import type { LoginInput } from "@/modules/auth/types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const INVALID_LOGIN_MESSAGE = "The identifier or password is incorrect.";

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function isValidLoginInput(input: LoginInput): boolean {
  return input.identifier.trim().length > 0 && input.password.length > 0;
}

async function writeAuditLog(data: {
  accountId?: string;
  action: string;
  entityId?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      accountId: data.accountId,
      action: data.action,
      entity: "Account",
      entityId: data.entityId,
    },
  });
}

async function recordFailedLogin(accountId: string): Promise<void> {
  const now = new Date();

  let failedLoginAttempts: number;

  try {
    const account = await prisma.account.update({
      where: { id: accountId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    failedLoginAttempts = account.failedLoginAttempts;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return;
    }

    throw error;
  }

  const shouldLock = failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

  if (shouldLock) {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
      },
    });
  }

  await writeAuditLog({
    accountId,
    action: shouldLock ? "LOGIN_LOCKED" : "LOGIN_FAILED",
    entityId: accountId,
  });
}

export async function login(input: LoginInput): Promise<void> {
  if (!isValidLoginInput(input)) {
    throw new ValidationError("Enter an email or phone number and password.");
  }

  const identifier = normalizeIdentifier(input.identifier);
  const account = await withDatabaseError(() =>
    prisma.account.findFirst({
      where: { OR: [{ email: identifier }, { phone: input.identifier.trim() }] },
      select: {
        id: true,
        passwordHash: true,
        status: true,
        lockedUntil: true,
        deletedAt: true,
      },
    }),
  );

  if (!account) {
    await withDatabaseError(() => writeAuditLog({ action: "LOGIN_FAILED" }));
    throw new AuthenticationError(INVALID_LOGIN_MESSAGE);
  }

  if (account.deletedAt || account.status !== AccountStatus.ACTIVE) {
    await withDatabaseError(() => writeAuditLog({ accountId: account.id, action: "LOGIN_REJECTED", entityId: account.id }));
    throw new AuthenticationError(INVALID_LOGIN_MESSAGE);
  }

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    await withDatabaseError(() => writeAuditLog({ accountId: account.id, action: "LOGIN_REJECTED", entityId: account.id }));
    throw new AuthenticationError(INVALID_LOGIN_MESSAGE);
  }

  const passwordMatches = await verifyPassword(input.password, account.passwordHash);

  if (!passwordMatches) {
    await withDatabaseError(() => recordFailedLogin(account.id));
    throw new AuthenticationError(INVALID_LOGIN_MESSAGE);
  }

  const requestHeaders = await headers();
  const now = new Date();

  await withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      await transaction.account.update({
        where: { id: account.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
      });
      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "LOGIN_SUCCESS",
          entity: "Account",
          entityId: account.id,
        },
      });
    }),
  );

  await createSession(account.id, {
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  });
}
