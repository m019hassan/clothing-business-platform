import "server-only";

import { AccountStatus, AccountType, Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/modules/auth/infrastructure/password";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import type { UserDetailView, UserListItemView, UserListPage } from "@/modules/users/types";
import { prisma } from "@/src/lib/db";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid, type Pagination } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_EMAIL = 150;
const MAX_PHONE = 30;
const MAX_NAME = 100;
const MAX_JOB_TITLE = 100;
const MAX_SEARCH = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MANAGED_TYPES: readonly AccountType[] = ["CUSTOMER", "EMPLOYEE", "DISTRIBUTOR"];
const MANAGED_STATUSES: readonly AccountStatus[] = ["ACTIVE", "SUSPENDED", "ARCHIVED"];

export type UserCreateInput = {
  accountType: AccountType;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName?: string | null;
  classificationCode?: string;
  departmentCode?: string;
  jobTitle?: string | null;
  branchId?: string | null;
  roleIds?: string[];
};

export type UserUpdateInput = {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  phone?: string;
  status?: AccountStatus;
  jobTitle?: string | null;
  branchId?: string | null;
  roleIds?: string[];
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseRequiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${field} is required.`);
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

function parseOptionalText(value: unknown, field: string, max: number): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string or null.`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters.`);
  }

  return trimmed;
}

function parseEmail(value: unknown): string {
  const email = parseRequiredText(value, "email", MAX_EMAIL).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError("email must be a valid email address.");
  }

  return email;
}

function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return value;
}

function parseIdList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array of ids.`);
  }

  const ids = value.filter((entry): entry is string => typeof entry === "string");

  if (ids.length !== value.length || !ids.every((id) => isUuid(id))) {
    throw new ValidationError(`${field} must contain valid ids.`);
  }

  return [...new Set(ids)];
}

/** Validates an account creation payload. Unknown keys are rejected. */
export function parseUserCreateInput(payload: unknown): UserCreateInput {
  const body = asRecord(payload);
  const allowed = [
    "accountType",
    "email",
    "phone",
    "password",
    "firstName",
    "lastName",
    "classificationCode",
    "departmentCode",
    "jobTitle",
    "branchId",
    "roleIds",
  ];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const accountType = body.accountType;

  if (typeof accountType !== "string" || !MANAGED_TYPES.includes(accountType as AccountType)) {
    throw new ValidationError(
      `accountType must be one of: ${MANAGED_TYPES.join(", ")}. (Distributor accounts arrive with phase I4.)`,
    );
  }

  const input: UserCreateInput = {
    accountType: accountType as AccountType,
    email: parseEmail(body.email),
    phone: parseRequiredText(body.phone, "phone", MAX_PHONE),
    password: parsePassword(body.password),
    firstName: parseRequiredText(body.firstName, "firstName", MAX_NAME),
  };

  if (body.lastName !== undefined) input.lastName = parseOptionalText(body.lastName, "lastName", MAX_NAME);
  if (body.jobTitle !== undefined) input.jobTitle = parseOptionalText(body.jobTitle, "jobTitle", MAX_JOB_TITLE);

  if (body.classificationCode !== undefined) {
    input.classificationCode = parseRequiredText(body.classificationCode, "classificationCode", 50).toUpperCase();
  }

  if (body.departmentCode !== undefined) {
    input.departmentCode = parseRequiredText(body.departmentCode, "departmentCode", 50).toUpperCase();
  }

  if (body.branchId !== undefined) {
    if (body.branchId !== null && (typeof body.branchId !== "string" || !isUuid(body.branchId))) {
      throw new ValidationError("branchId must be a branch id or null.");
    }

    input.branchId = body.branchId as string | null;
  }

  if (body.roleIds !== undefined) input.roleIds = parseIdList(body.roleIds, "roleIds");

  if (input.accountType === "DISTRIBUTOR" && !input.branchId) {
    throw new ValidationError("A distributor account needs a branchId.");
  }

  return input;
}

/** Validates an account update payload. Unknown keys are rejected. */
export function parseUserUpdateInput(payload: unknown): UserUpdateInput {
  const body = asRecord(payload);
  const allowed = ["firstName", "lastName", "email", "phone", "status", "jobTitle", "branchId", "roleIds"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: UserUpdateInput = {};

  if (body.firstName !== undefined) input.firstName = parseRequiredText(body.firstName, "firstName", MAX_NAME);
  if (body.lastName !== undefined) input.lastName = parseOptionalText(body.lastName, "lastName", MAX_NAME);
  if (body.email !== undefined) input.email = parseEmail(body.email);
  if (body.phone !== undefined) input.phone = parseRequiredText(body.phone, "phone", MAX_PHONE);
  if (body.jobTitle !== undefined) input.jobTitle = parseOptionalText(body.jobTitle, "jobTitle", MAX_JOB_TITLE);

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !MANAGED_STATUSES.includes(body.status as AccountStatus)) {
      throw new ValidationError(`status must be one of: ${MANAGED_STATUSES.join(", ")}.`);
    }

    input.status = body.status as AccountStatus;
  }

  if (body.branchId !== undefined) {
    if (body.branchId !== null && (typeof body.branchId !== "string" || !isUuid(body.branchId))) {
      throw new ValidationError("branchId must be a branch id or null.");
    }

    input.branchId = body.branchId as string | null;
  }

  if (body.roleIds !== undefined) input.roleIds = parseIdList(body.roleIds, "roleIds");

  if (Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

export type UserListFilters = {
  accountType?: AccountType;
  status?: AccountStatus;
  search?: string;
};

export function parseUserListFilters(searchParams: URLSearchParams): UserListFilters {
  const filters: UserListFilters = {};

  const type = searchParams.get("type");
  if (type !== null) {
    if (!MANAGED_TYPES.includes(type as AccountType)) {
      throw new ValidationError(`type must be one of: ${MANAGED_TYPES.join(", ")}.`);
    }

    filters.accountType = type as AccountType;
  }

  const status = searchParams.get("status");
  if (status !== null) {
    const statuses = [...MANAGED_STATUSES, "LOCKED"] as AccountStatus[];

    if (!statuses.includes(status as AccountStatus)) {
      throw new ValidationError(`status must be one of: ${statuses.join(", ")}.`);
    }

    filters.status = status as AccountStatus;
  }

  const search = searchParams.get("q");
  if (search !== null) {
    const trimmed = search.trim();

    if (trimmed.length === 0 || trimmed.length > MAX_SEARCH) {
      throw new ValidationError(`q must be between 1 and ${MAX_SEARCH} characters.`);
    }

    filters.search = trimmed;
  }

  return filters;
}

const accountSelection = {
  id: true,
  accountType: true,
  status: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
  customerProfile: { select: { firstName: true, lastName: true, customerCode: true } },
  distributorProfile: {
    select: { firstName: true, lastName: true, distributorCode: true, branchId: true },
  },
  employeeProfile: {
    select: {
      firstName: true,
      lastName: true,
      employeeNumber: true,
      branchId: true,
      employeeRoles: { select: { role: { select: { id: true, code: true, name: true } } } },
    },
  },
} satisfies Prisma.AccountSelect;

type AccountRecord = Prisma.AccountGetPayload<{ select: typeof accountSelection }>;

function displayName(record: AccountRecord): string {
  const profile = record.customerProfile ?? record.employeeProfile ?? record.distributorProfile;

  if (!profile) {
    return record.email ?? record.phone;
  }

  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || (record.email ?? record.phone);
}

function mapUser(record: AccountRecord): UserListItemView {
  return {
    id: record.id,
    accountType: record.accountType,
    status: record.status,
    email: record.email,
    phone: record.phone,
    displayName: displayName(record),
    profileCode:
      record.customerProfile?.customerCode ??
      record.employeeProfile?.employeeNumber ??
      record.distributorProfile?.distributorCode ??
      null,
    branchId: record.employeeProfile?.branchId ?? record.distributorProfile?.branchId ?? null,
    roles:
      record.employeeProfile?.employeeRoles.map((entry) => ({
        id: entry.role.id,
        code: entry.role.code,
        name: entry.role.name,
      })) ?? [],
    lastLoginAt: record.lastLoginAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapUserDetail(record: AccountRecord): UserDetailView {
  return {
    ...mapUser(record),
    emailVerified: record.emailVerified,
    phoneVerified: record.phoneVerified,
    failedLoginAttempts: record.failedLoginAttempts,
    lockedUntil: record.lockedUntil?.toISOString() ?? null,
  };
}

function generateCode(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
}

function conflictFrom(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("An account with this email or phone already exists.");
  }

  throw error;
}

/** Account directory (users.view). */
export async function listUsers(
  account: AuthenticatedAccount,
  pagination: Pagination,
  filters: UserListFilters = {},
): Promise<UserListPage> {
  await requirePermission(PERMISSIONS.USERS_VIEW);

  const where: Prisma.AccountWhereInput = { deletedAt: null };

  if (filters.accountType) where.accountType = filters.accountType;
  if (filters.status) where.status = filters.status;

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
      { customerProfile: { firstName: { contains: filters.search, mode: "insensitive" } } },
      { customerProfile: { lastName: { contains: filters.search, mode: "insensitive" } } },
      { customerProfile: { customerCode: { contains: filters.search, mode: "insensitive" } } },
      { employeeProfile: { firstName: { contains: filters.search, mode: "insensitive" } } },
      { employeeProfile: { lastName: { contains: filters.search, mode: "insensitive" } } },
      { employeeProfile: { employeeNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return withDatabaseError(async () => {
    const [records, total] = await prisma.$transaction([
      prisma.account.findMany({
        where,
        select: accountSelection,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.account.count({ where }),
    ]);

    return {
      users: records.map(mapUser),
      pagination: { limit: pagination.limit, offset: pagination.offset, total },
    };
  });
}

export async function getUser(
  account: AuthenticatedAccount,
  accountId: string,
): Promise<UserDetailView> {
  await requirePermission(PERMISSIONS.USERS_VIEW);

  if (!isUuid(accountId)) {
    throw new NotFoundError("Account not found.");
  }

  const record = await withDatabaseError(() =>
    prisma.account.findFirst({ where: { id: accountId, deletedAt: null }, select: accountSelection }),
  );

  if (!record) {
    throw new NotFoundError("Account not found.");
  }

  return mapUserDetail(record);
}

async function resolveBranchId(branchId: string | null | undefined): Promise<string | null> {
  if (!branchId) {
    return null;
  }

  const branch = await withDatabaseError(() =>
    prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
  );

  if (!branch) {
    throw new NotFoundError("Branch not found.");
  }

  return branch.id;
}

async function assertRolesExist(roleIds: string[]): Promise<void> {
  if (roleIds.length === 0) {
    return;
  }

  const found = await withDatabaseError(() => prisma.role.count({ where: { id: { in: roleIds } } }));

  if (found !== roleIds.length) {
    throw new NotFoundError("One or more roles were not found.");
  }
}

/** Creates a customer or employee account (users.manage). */
export async function createUser(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<UserDetailView> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const input = parseUserCreateInput(payload);
  const passwordHash = await hashPassword(input.password);
  const branchId = await resolveBranchId(input.branchId);
  await assertRolesExist(input.roleIds ?? []);

  const created = await withDatabaseError(async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        if (input.accountType === "CUSTOMER") {
          const code = input.classificationCode ?? "RETAIL";
          const classification = await transaction.customerClassification.upsert({
            where: { code },
            create: { code, name: code },
            update: {},
            select: { id: true },
          });

          return transaction.account.create({
            data: {
              accountType: "CUSTOMER",
              status: "ACTIVE",
              email: input.email,
              phone: input.phone,
              passwordHash,
              customerProfile: {
                create: {
                  customerCode: generateCode("C"),
                  classificationId: classification.id,
                  firstName: input.firstName,
                  lastName: input.lastName ?? null,
                },
              },
            },
            select: accountSelection,
          });
        }

        if (input.accountType === "DISTRIBUTOR") {
          return transaction.account.create({
            data: {
              accountType: "DISTRIBUTOR",
              status: "ACTIVE",
              email: input.email,
              phone: input.phone,
              passwordHash,
              distributorProfile: {
                create: {
                  distributorCode: generateCode("D"),
                  branchId: branchId as string,
                  firstName: input.firstName,
                  lastName: input.lastName ?? null,
                },
              },
            },
            select: accountSelection,
          });
        }

        const departmentCode = input.departmentCode ?? "OPS";
        const department = await transaction.department.upsert({
          where: { code: departmentCode },
          create: { code: departmentCode, name: departmentCode },
          update: {},
          select: { id: true },
        });

        const employee = await transaction.account.create({
          data: {
            accountType: "EMPLOYEE",
            status: "ACTIVE",
            email: input.email,
            phone: input.phone,
            passwordHash,
            employeeProfile: {
              create: {
                employeeNumber: generateCode("E"),
                departmentId: department.id,
                firstName: input.firstName,
                lastName: input.lastName ?? null,
                jobTitle: input.jobTitle ?? null,
                branchId,
              },
            },
          },
          select: { id: true },
        });

        if (input.roleIds && input.roleIds.length > 0) {
          const profile = await transaction.employeeProfile.findUniqueOrThrow({
            where: { accountId: employee.id },
            select: { id: true },
          });

          await transaction.employeeRole.createMany({
            data: input.roleIds.map((roleId) => ({ employeeId: profile.id, roleId })),
          });
        }

        return transaction.account.findUniqueOrThrow({ where: { id: employee.id }, select: accountSelection });
      });
    } catch (error) {
      return conflictFrom(error);
    }
  });

  return mapUserDetail(created);
}

/** Updates an account, its status, branch and (for employees) its roles. */
export async function updateUser(
  account: AuthenticatedAccount,
  accountId: string,
  payload: unknown,
): Promise<UserDetailView> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  if (!isUuid(accountId)) {
    throw new NotFoundError("Account not found.");
  }

  const input = parseUserUpdateInput(payload);

  if (accountId === account.id && input.status !== undefined && input.status !== "ACTIVE") {
    throw new ValidationError("You cannot change the status of your own account.");
  }

  const branchId = await resolveBranchId(input.branchId);
  await assertRolesExist(input.roleIds ?? []);

  const target = await withDatabaseError(() =>
    prisma.account.findFirst({
      where: { id: accountId, deletedAt: null },
      select: { id: true, accountType: true },
    }),
  );

  if (!target) {
    throw new NotFoundError("Account not found.");
  }

  const updated = await withDatabaseError(async () => {
    try {
      return await prisma.$transaction(async (transaction) => {
        const data: Prisma.AccountUpdateInput = {};

        if (input.email !== undefined) data.email = input.email;
        if (input.phone !== undefined) data.phone = input.phone;

        if (input.status !== undefined) {
          data.status = input.status;

          // Reactivating an account also clears a login lockout.
          if (input.status === "ACTIVE") {
            data.failedLoginAttempts = 0;
            data.lockedUntil = null;
          }
        }

        if (Object.keys(data).length > 0) {
          await transaction.account.update({ where: { id: accountId }, data });
        }

        if (target.accountType === "DISTRIBUTOR") {
          const distributorData: Prisma.DistributorProfileUncheckedUpdateInput = {};

          if (input.firstName !== undefined) distributorData.firstName = input.firstName;
          if (input.lastName !== undefined) distributorData.lastName = input.lastName;
          if (input.branchId !== undefined && branchId) distributorData.branchId = branchId;

          if (Object.keys(distributorData).length > 0) {
            await transaction.distributorProfile.update({ where: { accountId }, data: distributorData });
          }
        } else if (target.accountType === "CUSTOMER") {
          const profileData: Prisma.CustomerProfileUpdateInput = {};

          if (input.firstName !== undefined) profileData.firstName = input.firstName;
          if (input.lastName !== undefined) profileData.lastName = input.lastName;

          if (Object.keys(profileData).length > 0) {
            // accountId is unique, so a plain update works and keeps the profile row.
            await transaction.customerProfile.update({ where: { accountId }, data: profileData });
          }
        } else {
          const profileData: Prisma.EmployeeProfileUncheckedUpdateInput = {};

          if (input.firstName !== undefined) profileData.firstName = input.firstName;
          if (input.lastName !== undefined) profileData.lastName = input.lastName;
          if (input.jobTitle !== undefined) profileData.jobTitle = input.jobTitle;
          // updateMany cannot express relation changes, so the FK scalar is set directly.
          const employeeData: Prisma.EmployeeProfileUncheckedUpdateInput = {
            ...profileData,
            ...(input.branchId !== undefined ? { branchId } : {}),
          };

          if (Object.keys(employeeData).length > 0) {
            await transaction.employeeProfile.update({ where: { accountId }, data: employeeData });
          }

          if (input.roleIds !== undefined) {
            const profile = await transaction.employeeProfile.findUniqueOrThrow({
              where: { accountId },
              select: { id: true },
            });

            await transaction.employeeRole.deleteMany({ where: { employeeId: profile.id } });

            if (input.roleIds.length > 0) {
              await transaction.employeeRole.createMany({
                data: input.roleIds.map((roleId) => ({ employeeId: profile.id, roleId })),
              });
            }
          }
        }

        await transaction.auditLog.create({
          data: {
            accountId: account.id,
            action: "ACCOUNT_UPDATED",
            entity: "Account",
            entityId: accountId,
          },
        });

        return transaction.account.findUniqueOrThrow({ where: { id: accountId }, select: accountSelection });
      });
    } catch (error) {
      return conflictFrom(error);
    }
  });

  return mapUserDetail(updated);
}

/** Sets a new password and drops every existing session of that account. */
export async function resetUserPassword(
  account: AuthenticatedAccount,
  accountId: string,
  payload: unknown,
): Promise<{ id: string; sessionsRevoked: number }> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  if (!isUuid(accountId)) {
    throw new NotFoundError("Account not found.");
  }

  const body = asRecord(payload);
  const unknownKeys = Object.keys(body).filter((key) => key !== "password");

  if (unknownKeys.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknownKeys.join(", ")}.`);
  }

  const password = parsePassword(body.password);
  const passwordHash = await hashPassword(password);

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const target = await transaction.account.findFirst({
        where: { id: accountId, deletedAt: null },
        select: { id: true },
      });

      if (!target) {
        throw new NotFoundError("Account not found.");
      }

      await transaction.account.update({
        where: { id: accountId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });

      const revoked = await transaction.session.deleteMany({ where: { accountId } });

      await transaction.auditLog.create({
        data: {
          accountId: account.id,
          action: "PASSWORD_RESET",
          entity: "Account",
          entityId: accountId,
        },
      });

      return { id: accountId, sessionsRevoked: revoked.count };
    }),
  );
}
