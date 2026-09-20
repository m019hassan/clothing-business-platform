import type { AccountStatus, AccountType, Gender } from "@prisma/client";

export type AccountOverviewView = {
  id: string;
  accountType: AccountType;
  status: AccountStatus;
  email: string | null;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferredLanguage: string;
  timezone: string;
  lastLoginAt: string | null;
  createdAt: string;
  customer: {
    customerCode: string;
    firstName: string;
    lastName: string | null;
    gender: Gender | null;
    birthDate: string | null;
    marketingConsent: boolean;
    classificationName: string | null;
  } | null;
  employee: {
    employeeNumber: string;
    departmentName: string | null;
    jobTitle: string | null;
  } | null;
};
