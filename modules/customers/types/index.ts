import type { AccountStatus, AccountType, Gender, OrderStatus } from "@prisma/client";

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

export type CustomerListView = {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string;
  accountStatus: AccountStatus;
  classificationName: string | null;
  orderCount: number;
  createdAt: string;
};

export type CustomerOrderSummaryView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  currency: string;
  createdAt: string;
};

export type CustomerDetailView = CustomerListView & {
  gender: Gender | null;
  birthDate: string | null;
  marketingConsent: boolean;
  notes: string | null;
  lastLoginAt: string | null;
  recentOrders: CustomerOrderSummaryView[];
};
