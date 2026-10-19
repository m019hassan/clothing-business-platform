import "server-only";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import type { SafeAccount } from "@/modules/auth/infrastructure/session";
import { prisma } from "@/src/lib/db";
import { NotFoundError, ValidationError, withDatabaseError } from "@/src/lib/errors";
import { isUuid } from "@/src/lib/validation";

type AuthenticatedAccount = NonNullable<SafeAccount>;

export type CashierRowView = {
  id: string;
  name: string;
  code: string;
  branchName: string;
  branchCode: string;
  email: string | null;
  phone: string;
  canDiscount: boolean;
  discountCode: string | null;
  discountPercent: string | null;
};

/** The counter staff with the discount switches the admin manages. */
export async function listCashiers(_account: AuthenticatedAccount): Promise<CashierRowView[]> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const rows = await withDatabaseError(() =>
    prisma.distributorProfile.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        distributorCode: true,
        canDiscount: true,
        discountCode: true,
        discountPercent: true,
        branch: { select: { name: true, code: true } },
        account: { select: { email: true, phone: true } },
      },
    }),
  );

  return rows.map((row) => ({
    id: row.id,
    name: [row.firstName, row.lastName].filter(Boolean).join(" "),
    code: row.distributorCode,
    branchName: row.branch.name,
    branchCode: row.branch.code,
    email: row.account.email,
    phone: row.account.phone,
    canDiscount: row.canDiscount,
    discountCode: row.discountCode,
    discountPercent: row.discountPercent?.toFixed(2) ?? null,
  }));
}

/** Allow or deny one cashier's invoice discount and set their personal code. */
export async function updateCashierDiscount(
  _account: AuthenticatedAccount,
  distributorId: string,
  input: { canDiscount: boolean; discountCode: string | null; discountPercent: number | null },
): Promise<{ id: string }> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  if (!isUuid(distributorId)) {
    throw new NotFoundError("Cashier not found.");
  }

  const code = (input.discountCode ?? "").trim().toUpperCase();

  if (code !== "" && !/^[A-Z0-9_-]{3,40}$/.test(code)) {
    throw new ValidationError("Discount codes are 3-40 letters, digits, - or _.");
  }

  let percent: Prisma.Decimal | null = null;

  if (input.discountPercent !== null) {
    if (Number.isFinite(input.discountPercent) === false || input.discountPercent < 0 || input.discountPercent > 100) {
      throw new ValidationError("discountPercent must be between 0 and 100.");
    }

    percent = new Prisma.Decimal(input.discountPercent).toDecimalPlaces(2);
  }

  if (code !== "" && percent === null) {
    throw new ValidationError("A discount code needs its percent.");
  }

  return withDatabaseError(async () => {
    try {
      await prisma.distributorProfile.update({
        where: { id: distributorId },
        data: {
          canDiscount: input.canDiscount,
          discountCode: code === "" ? null : code,
          discountPercent: percent,
        },
        select: { id: true },
      });

      return { id: distributorId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ValidationError("This discount code is already used by another cashier.");
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Cashier not found.");
      }

      throw error;
    }
  });
}
