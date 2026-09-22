"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createBranch, updateBranch } from "@/modules/branches/application/branches";
import { branchFormToPayload } from "@/modules/branches/application/form-payloads";
import { toAppError } from "@/src/lib/errors";

export type BranchFormState = {
  ok: boolean;
  message: string;
};

function failure(error: unknown): BranchFormState {
  const appError = toAppError(error);

  return {
    ok: false,
    message:
      appError.code === "VALIDATION_ERROR" ||
      appError.code === "CONFLICT" ||
      appError.code === "AUTHORIZATION_ERROR" ||
      appError.code === "NOT_FOUND"
        ? appError.message
        : "Unable to save the branch right now.",
  };
}

export async function createBranchAction(
  _previousState: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  try {
    const account = await requireAuthenticated();
    const branch = await createBranch(account, branchFormToPayload(formData, { partial: false }));

    revalidatePath("/admin/branches");
    revalidatePath("/admin");

    return { ok: true, message: `${branch.name} (${branch.code}) created.` };
  } catch (error) {
    return failure(error);
  }
}

export async function updateBranchAction(
  _previousState: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  const branchId = formData.get("branchId");

  try {
    const account = await requireAuthenticated();

    if (typeof branchId !== "string" || branchId.length === 0) {
      throw new Error("Missing branch id");
    }

    const branch = await updateBranch(account, branchId, branchFormToPayload(formData, { partial: true }));

    revalidatePath("/admin/branches");
    revalidatePath("/admin");

    return { ok: true, message: `${branch.name} updated.` };
  } catch (error) {
    return failure(error);
  }
}
