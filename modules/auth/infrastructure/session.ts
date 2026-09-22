import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";

import { AccountStatus } from "@prisma/client";

import { prisma } from "@/src/lib/db";
import { requireAuthSecret } from "@/src/lib/env";
import { AuthenticationError, withDatabaseError } from "@/src/lib/errors";

const SESSION_COOKIE_NAME = "clothing-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

const accountSelection = {
  id: true,
  accountType: true,
  distributorProfile: { select: { id: true, branchId: true, distributorCode: true } },
  status: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  preferredLanguage: true,
  timezone: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  customerProfile: { select: { id: true } },
  employeeProfile: { select: { id: true, branchId: true } },
} as const;

export type SafeAccount = Awaited<ReturnType<typeof getCurrentAccount>>;

function hashSessionToken(token: string): string {
  return createHmac("sha256", requireAuthSecret()).update(token).digest("hex");
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  };
}

export async function createSession(
  accountId: string,
  requestMetadata?: { ipAddress?: string; userAgent?: string },
  expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");

  await withDatabaseError(() =>
    prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
  );

  await withDatabaseError(() =>
    prisma.session.create({
      data: {
        accountId,
        refreshToken: hashSessionToken(rawToken),
        expiresAt,
        ipAddress: requestMetadata?.ipAddress,
        userAgent: requestMetadata?.userAgent,
        lastActivityAt: new Date(),
      },
    }),
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, sessionCookieOptions(expiresAt));
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await withDatabaseError(() =>
      prisma.session.deleteMany({
        where: { refreshToken: hashSessionToken(rawToken) },
      }),
    );
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getCurrentAccount = cache(async () => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await withDatabaseError(() =>
    prisma.session.findUnique({
      where: { refreshToken: hashSessionToken(rawToken) },
      select: {
        id: true,
        expiresAt: true,
        account: { select: accountSelection },
      },
    }),
  );

  if (!session) {
    return null;
  }

  if (
    session.expiresAt <= new Date() ||
    session.account.deletedAt ||
    session.account.status !== AccountStatus.ACTIVE
  ) {
    await withDatabaseError(() => prisma.session.delete({ where: { id: session.id } }));
    return null;
  }

  return session.account;
});

export async function requireAuthenticated() {
  const account = await getCurrentAccount();

  if (!account) {
    throw new AuthenticationError();
  }

  return account;
}
