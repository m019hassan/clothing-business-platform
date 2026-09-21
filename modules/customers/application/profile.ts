import "server-only";

import { Gender } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_NAME = 100;
const MIN_BIRTH_YEAR = 1900;
const GENDERS: readonly Gender[] = ["MALE", "FEMALE", "OTHER"];
const BIRTH_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type CustomerProfileView = {
  customerCode: string;
  firstName: string;
  lastName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  marketingConsent: boolean;
  classificationName: string | null;
};

export type CustomerProfileWriteInput = {
  firstName?: string;
  lastName?: string | null;
  gender?: Gender | null;
  birthDate?: Date | null;
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("firstName is required.");
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("firstName is required.");
  }

  if (trimmed.length > MAX_NAME) {
    throw new ValidationError(`firstName must be at most ${MAX_NAME} characters.`);
  }

  return trimmed;
}

function parseOptionalName(value: unknown, field: string): string | null {
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

  if (trimmed.length > MAX_NAME) {
    throw new ValidationError(`${field} must be at most ${MAX_NAME} characters.`);
  }

  return trimmed;
}

function parseGender(value: unknown): Gender | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !GENDERS.includes(value as Gender)) {
    throw new ValidationError(`gender must be one of: ${GENDERS.join(", ")}, or null.`);
  }

  return value as Gender;
}

function parseBirthDate(value: unknown): Date | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || !BIRTH_DATE_PATTERN.test(value)) {
    throw new ValidationError("birthDate must be an ISO date (YYYY-MM-DD) or null.");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(value)) {
    throw new ValidationError("birthDate must be a real calendar date.");
  }

  const now = new Date();

  if (parsed.getTime() > now.getTime()) {
    throw new ValidationError("birthDate cannot be in the future.");
  }

  if (parsed.getUTCFullYear() < MIN_BIRTH_YEAR) {
    throw new ValidationError(`birthDate must be after ${MIN_BIRTH_YEAR - 1}.`);
  }

  return parsed;
}

/** Validates a self-service profile payload. Unknown keys are rejected. */
export function parseCustomerProfileWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): CustomerProfileWriteInput {
  const body = asRecord(payload);
  const allowed = ["firstName", "lastName", "gender", "birthDate"];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: CustomerProfileWriteInput = {};

  if (body.firstName !== undefined) {
    input.firstName = parseName(body.firstName);
  } else if (!partial) {
    throw new ValidationError("firstName is required.");
  }

  if (body.lastName !== undefined) {
    input.lastName = parseOptionalName(body.lastName, "lastName");
  }

  if (body.gender !== undefined) {
    input.gender = parseGender(body.gender);
  }

  if (body.birthDate !== undefined) {
    input.birthDate = parseBirthDate(body.birthDate);
  }

  if (partial && Object.keys(input).length === 0) {
    throw new ValidationError("Provide at least one field to update.");
  }

  return input;
}

function requireCustomerProfileId(account: AuthenticatedAccount): string {
  if (account.accountType !== "CUSTOMER" || !account.customerProfile) {
    throw new AuthorizationError("A customer account is required.");
  }

  return account.customerProfile.id;
}

const profileSelection = {
  customerCode: true,
  firstName: true,
  lastName: true,
  gender: true,
  birthDate: true,
  marketingConsent: true,
  classification: { select: { name: true } },
} as const;

export async function getCustomerProfile(
  account: AuthenticatedAccount,
): Promise<CustomerProfileView> {
  const profileId = requireCustomerProfileId(account);

  const profile = await withDatabaseError(() =>
    prisma.customerProfile.findUnique({ where: { id: profileId }, select: profileSelection }),
  );

  if (!profile) {
    throw new NotFoundError("Customer profile not found.");
  }

  return {
    customerCode: profile.customerCode,
    firstName: profile.firstName,
    lastName: profile.lastName,
    gender: profile.gender,
    birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
    marketingConsent: profile.marketingConsent,
    classificationName: profile.classification?.name ?? null,
  };
}

export async function updateCustomerProfile(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<CustomerProfileView> {
  const profileId = requireCustomerProfileId(account);
  const input = parseCustomerProfileWriteInput(payload, { partial: true });

  await withDatabaseError(() =>
    prisma.customerProfile.update({
      where: { id: profileId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
      },
    }),
  );

  return getCustomerProfile(account);
}
