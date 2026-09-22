import "server-only";

import { Prisma } from "@prisma/client";

import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  withDatabaseError,
} from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

const MAX_LABEL = 50;
const MAX_NAME = 100;
const MAX_PHONE = 30;
const MAX_LINE = 200;
const MAX_CITY = 100;
const MAX_REGION = 100;
const MAX_POSTAL = 20;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

export type AddressView = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressWriteInput = {
  label?: string | null;
  recipientName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  isDefault?: boolean;
};

/** Snapshot stored on the order so later address edits cannot rewrite history. */
export type DeliveryAddressSnapshot = Omit<AddressView, "id" | "isDefault" | "createdAt" | "updatedAt">;

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  return payload as Record<string, unknown>;
}

function parseRequired(value: unknown, field: string, max: number): string {
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

function parseOptional(value: unknown, field: string, max: number): string | null {
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

function parseCountry(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("country must be a two-letter country code.");
  }

  const country = value.trim().toUpperCase();

  if (!COUNTRY_PATTERN.test(country)) {
    throw new ValidationError("country must be a two-letter country code such as SA.");
  }

  return country;
}

/** Validates an address create/update payload. Unknown keys are rejected. */
export function parseAddressWriteInput(
  payload: unknown,
  { partial }: { partial: boolean },
): AddressWriteInput {
  const body = asRecord(payload);
  const allowed = [
    "label",
    "recipientName",
    "phone",
    "line1",
    "line2",
    "city",
    "region",
    "postalCode",
    "country",
    "isDefault",
  ];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    throw new ValidationError(`Unknown field(s): ${unknown.join(", ")}.`);
  }

  const input: AddressWriteInput = {};

  const required = (key: "recipientName" | "phone" | "line1" | "city", max: number) => {
    if (body[key] !== undefined) {
      input[key] = parseRequired(body[key], key, max);
    } else if (!partial) {
      throw new ValidationError(`${key} is required.`);
    }
  };

  required("recipientName", MAX_NAME);
  required("phone", MAX_PHONE);
  required("line1", MAX_LINE);
  required("city", MAX_CITY);

  if (body.label !== undefined) input.label = parseOptional(body.label, "label", MAX_LABEL);
  if (body.line2 !== undefined) input.line2 = parseOptional(body.line2, "line2", MAX_LINE);
  if (body.region !== undefined) input.region = parseOptional(body.region, "region", MAX_REGION);
  if (body.postalCode !== undefined) input.postalCode = parseOptional(body.postalCode, "postalCode", MAX_POSTAL);
  if (body.country !== undefined) input.country = parseCountry(body.country);

  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") {
      throw new ValidationError("isDefault must be a boolean.");
    }

    input.isDefault = body.isDefault;
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

const addressSelection = {
  id: true,
  label: true,
  recipientName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  region: true,
  postalCode: true,
  country: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AddressRecord = Prisma.AddressGetPayload<{ select: typeof addressSelection }>;

function mapAddress(record: AddressRecord): AddressView {
  return {
    id: record.id,
    label: record.label,
    recipientName: record.recipientName,
    phone: record.phone,
    line1: record.line1,
    line2: record.line2,
    city: record.city,
    region: record.region,
    postalCode: record.postalCode,
    country: record.country,
    isDefault: record.isDefault,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toDeliverySnapshot(address: AddressView): DeliveryAddressSnapshot {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
  };
}

export async function listAddresses(account: AuthenticatedAccount): Promise<AddressView[]> {
  const profileId = requireCustomerProfileId(account);

  const records = await withDatabaseError(() =>
    prisma.address.findMany({
      where: { customerProfileId: profileId, deletedAt: null },
      select: addressSelection,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  );

  return records.map(mapAddress);
}

export async function createAddress(
  account: AuthenticatedAccount,
  payload: unknown,
): Promise<AddressView> {
  const profileId = requireCustomerProfileId(account);
  const input = parseAddressWriteInput(payload, { partial: false });

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      const existing = await transaction.address.count({
        where: { customerProfileId: profileId, deletedAt: null },
      });

      // The first address is always the default one.
      const isDefault = input.isDefault ?? existing === 0;

      if (isDefault) {
        await transaction.address.updateMany({
          where: { customerProfileId: profileId, deletedAt: null, isDefault: true },
          data: { isDefault: false },
        });
      }

      const record = await transaction.address.create({
        data: {
          customerProfileId: profileId,
          label: input.label ?? null,
          recipientName: input.recipientName as string,
          phone: input.phone as string,
          line1: input.line1 as string,
          line2: input.line2 ?? null,
          city: input.city as string,
          region: input.region ?? null,
          postalCode: input.postalCode ?? null,
          country: input.country ?? "SA",
          isDefault,
        },
        select: addressSelection,
      });

      return mapAddress(record);
    }),
  );
}

async function findOwnedAddress(profileId: string, addressId: string) {
  if (!isUuid(addressId)) {
    throw new NotFoundError("Address not found.");
  }

  const address = await withDatabaseError(() =>
    prisma.address.findFirst({
      where: { id: addressId, customerProfileId: profileId, deletedAt: null },
      select: addressSelection,
    }),
  );

  if (!address) {
    throw new NotFoundError("Address not found.");
  }

  return address;
}

export async function updateAddress(
  account: AuthenticatedAccount,
  addressId: string,
  payload: unknown,
): Promise<AddressView> {
  const profileId = requireCustomerProfileId(account);
  const input = parseAddressWriteInput(payload, { partial: true });
  await findOwnedAddress(profileId, addressId);

  return withDatabaseError(() =>
    prisma.$transaction(async (transaction) => {
      if (input.isDefault === true) {
        await transaction.address.updateMany({
          where: { customerProfileId: profileId, deletedAt: null, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      const record = await transaction.address.update({
        where: { id: addressId },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.recipientName !== undefined ? { recipientName: input.recipientName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
          ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.region !== undefined ? { region: input.region } : {}),
          ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
          ...(input.country !== undefined ? { country: input.country } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
        select: addressSelection,
      });

      return mapAddress(record);
    }),
  );
}

/** Soft delete: past orders keep their snapshot and the row stays auditable. */
export async function deleteAddress(
  account: AuthenticatedAccount,
  addressId: string,
): Promise<{ id: string; wasDefault: boolean }> {
  const profileId = requireCustomerProfileId(account);
  const address = await findOwnedAddress(profileId, addressId);

  await withDatabaseError(() =>
    prisma.address.update({
      where: { id: addressId },
      data: { deletedAt: new Date(), isDefault: false },
    }),
  );

  return { id: address.id, wasDefault: address.isDefault };
}

/**
 * Resolves an owned address for the order flow and returns the immutable
 * snapshot that is stored on the order.
 */
export async function resolveDeliveryAddress(
  account: AuthenticatedAccount,
  addressId: string,
): Promise<{ addressId: string; snapshot: DeliveryAddressSnapshot }> {
  const profileId = requireCustomerProfileId(account);
  const address = await findOwnedAddress(profileId, addressId);

  return { addressId: address.id, snapshot: toDeliverySnapshot(mapAddress(address)) };
}
