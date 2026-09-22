import type { AccountStatus, AccountType } from "@prisma/client";

export type UserListItemView = {
  id: string;
  accountType: AccountType;
  status: AccountStatus;
  email: string | null;
  phone: string;
  displayName: string;
  profileCode: string | null;
  branchId: string | null;
  roles: { id: string; code: string; name: string }[];
  lastLoginAt: string | null;
  createdAt: string;
};

export type UserListPage = {
  users: UserListItemView[];
  pagination: { limit: number; offset: number; total: number };
};

export type UserDetailView = UserListItemView & {
  emailVerified: boolean;
  phoneVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
};
