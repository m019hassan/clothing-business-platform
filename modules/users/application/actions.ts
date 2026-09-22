"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createUser,
  resetUserPassword,
  updateUser,
} from "@/modules/users/application/users";
import { toAppError } from "@/src/lib/errors";

export type UserFormState = {
  ok: boolean;
  message: string;
};

function failure(error: unknown): UserFormState {
  const appError = toAppError(error);

  return {
    ok: false,
    message:
      appError.code === "VALIDATION_ERROR" ||
      appError.code === "CONFLICT" ||
      appError.code === "AUTHORIZATION_ERROR" ||
      appError.code === "NOT_FOUND"
        ? appError.message
        : "Unable to save the account right now.",
  };
}

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

export async function createUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  try {
    const account = await requireAuthenticated();
    const accountType = text(formData, "accountType") ?? "CUSTOMER";
    const roleIds = formData.getAll("roleIds").filter((value): value is string => typeof value === "string");

    const user = await createUser(account, {
      accountType,
      email: text(formData, "email") ?? "",
      phone: text(formData, "phone") ?? "",
      password: text(formData, "password") ?? "",
      firstName: text(formData, "firstName") ?? "",
      lastName: text(formData, "lastName"),
      jobTitle: text(formData, "jobTitle"),
      branchId: text(formData, "branchId"),
      roleIds,
    });

    revalidatePath("/admin");

    return { ok: true, message: `${user.displayName} created (${user.profileCode}).` };
  } catch (error) {
    return failure(error);
  }
}

export async function updateUserAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const accountId = text(formData, "accountId");

  try {
    const account = await requireAuthenticated();

    if (!accountId) {
      throw new Error("Missing account id");
    }

    const status = text(formData, "status");
    const firstName = text(formData, "firstName");
    const roleIdsRaw = formData.getAll("roleIds");
    const hasRoleField = formData.has("rolesProvided");

    const user = await updateUser(account, accountId, {
      ...(status ? { status } : {}),
      ...(firstName ? { firstName } : {}),
      ...(hasRoleField
        ? { roleIds: roleIdsRaw.filter((value): value is string => typeof value === "string") }
        : {}),
    });

    revalidatePath("/admin");

    return { ok: true, message: `${user.displayName} updated.` };
  } catch (error) {
    return failure(error);
  }
}

export async function resetUserPasswordAction(
  _previousState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const accountId = text(formData, "accountId");
  const password = text(formData, "password") ?? "";

  try {
    const account = await requireAuthenticated();

    if (!accountId) {
      throw new Error("Missing account id");
    }

    const result = await resetUserPassword(account, accountId, { password });

    revalidatePath("/admin");

    return { ok: true, message: `Password updated. ${result.sessionsRevoked} session(s) signed out.` };
  } catch (error) {
    return failure(error);
  }
}
