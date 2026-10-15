import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { AuthorizationError, withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const COUNTER_PASSWORD_SENTINEL = "counter-no-login";
const CANDIDATE_LIMIT = 500;

/**
 * One canonical shape for a phone: +20/20/0-prefixed Egyptian numbers and bare
 * digits collapse to the same string, so 0100…, +20100… and 100… all match.
 */
export function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("20") && digits.length === 12) {
    return digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return digits.slice(1);
  }

  return digits;
}

type CandidateClient = Prisma.TransactionClient | typeof prisma;

/** Counter customers that can be matched by phone (walk-ins excluded). */
export function findCounterCustomerCandidates(client: CandidateClient) {
  return client.customerProfile.findMany({
    where: { isWalkIn: false, account: { accountType: "CUSTOMER" } },
    select: { id: true, firstName: true, lastName: true, account: { select: { phone: true } } },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_LIMIT,
  });
}

export type PosCustomerMatch = { found: boolean; name: string | null };

/** Does this phone belong to a known customer? Answered for the checkout hint. */
export async function lookupPosCustomer(
  account: AuthenticatedAccount,
  rawPhone: string,
): Promise<PosCustomerMatch> {
  if (account.accountType !== "DISTRIBUTOR" || !account.distributorProfile) {
    throw new AuthorizationError("A distributor account is required for point-of-sale lookups.");
  }

  const digits = normalizePhoneDigits(rawPhone);

  if (digits.length < 8) {
    return { found: false, name: null };
  }

  const candidates = await withDatabaseError(() => findCounterCustomerCandidates(prisma));
  const match = candidates.find((candidate) => normalizePhoneDigits(candidate.account.phone) === digits);

  if (match === undefined) {
    return { found: false, name: null };
  }

  const name = [match.firstName, match.lastName].filter(Boolean).join(" ").trim();

  return { found: true, name: name !== "" ? name : null };
}

/**
 * Registers the walk-in as a real customer record so the sale lands in the
 * customer directory (and, later, the marketing lists). Safe to call outside a
 * transaction: a phone unique race is re-read instead of crashing the sale.
 */
export async function registerCounterCustomer(
  client: CandidateClient,
  branch: { id: string; code: string; name: string },
  contact: { phone: string; name: string | null },
): Promise<string> {
  const digits = normalizePhoneDigits(contact.phone);

  const classification = await client.customerClassification.upsert({
    where: { code: "RETAIL" },
    create: { code: "RETAIL", name: "Retail" },
    update: {},
    select: { id: true },
  });

  const nameParts = (contact.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = (nameParts[0] ?? "عميل").slice(0, 100);
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ").slice(0, 100) : null;

  try {
    const account = await client.account.create({
      data: {
        accountType: "CUSTOMER",
        status: "ACTIVE",
        email: null,
        phone: contact.phone,
        passwordHash: COUNTER_PASSWORD_SENTINEL,
      },
      select: { id: true },
    });

    const profile = await client.customerProfile.create({
      data: {
        accountId: account.id,
        customerCode: `CUST-${randomBytes(4).toString("hex").toUpperCase()}`,
        classificationId: classification.id,
        firstName,
        lastName,
        isWalkIn: false,
        branchId: branch.id,
      },
      select: { id: true },
    });

    return profile.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Another terminal registered the same phone a heartbeat earlier.
      const candidates = await findCounterCustomerCandidates(client);
      const match = candidates.find((candidate) => normalizePhoneDigits(candidate.account.phone) === digits);

      if (match !== undefined) {
        return match.id;
      }
    }

    throw error;
  }
}
