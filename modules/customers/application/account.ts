import "server-only";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { AccountOverviewView } from "@/modules/customers/types";
import { prisma } from "@/src/lib/db";
import { NotFoundError, withDatabaseError } from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

/**
 * Read-only account overview for the authenticated account page.
 * There is no account/profile API yet, so this reads the existing models
 * directly and never exposes password hashes, sessions or internal notes.
 */
export async function getAccountOverview(
  account: AuthenticatedAccount,
): Promise<AccountOverviewView> {
  const record = await withDatabaseError(() =>
    prisma.account.findUnique({
      where: { id: account.id },
      select: {
        id: true,
        accountType: true,
        status: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        preferredLanguage: true,
        timezone: true,
        lastLoginAt: true,
        createdAt: true,
        customerProfile: {
          select: {
            customerCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
            marketingConsent: true,
            classification: { select: { name: true } },
          },
        },
        employeeProfile: {
          select: {
            employeeNumber: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
  );

  if (!record) {
    throw new NotFoundError("Account not found.");
  }

  return {
    id: record.id,
    accountType: record.accountType,
    status: record.status,
    email: record.email,
    phone: record.phone,
    emailVerified: record.emailVerified,
    phoneVerified: record.phoneVerified,
    preferredLanguage: record.preferredLanguage,
    timezone: record.timezone,
    lastLoginAt: record.lastLoginAt ? record.lastLoginAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    customer: record.customerProfile
      ? {
          customerCode: record.customerProfile.customerCode,
          firstName: record.customerProfile.firstName,
          lastName: record.customerProfile.lastName,
          gender: record.customerProfile.gender,
          birthDate: record.customerProfile.birthDate
            ? record.customerProfile.birthDate.toISOString()
            : null,
          marketingConsent: record.customerProfile.marketingConsent,
          classificationName: record.customerProfile.classification?.name ?? null,
        }
      : null,
    employee: record.employeeProfile
      ? {
          employeeNumber: record.employeeProfile.employeeNumber,
          departmentName: record.employeeProfile.department?.name ?? null,
          jobTitle: record.employeeProfile.jobTitle,
        }
      : null,
  };
}
