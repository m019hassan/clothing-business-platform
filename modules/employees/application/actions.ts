"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { rolePermissionsFormToPayload } from "@/modules/employees/application/form-payloads";
import { updateRolePermissions } from "@/modules/employees/application/role-permissions";
import { toAppError } from "@/src/lib/errors";

export type RoleFormState = {
  ok: boolean;
  message: string;
};

export async function updateRolePermissionsAction(
  _previousState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const roleId = formData.get("roleId");

  try {
    const account = await requireAuthenticated();

    if (typeof roleId !== "string" || roleId.length === 0) {
      throw new Error("Missing role id");
    }

    const role = await updateRolePermissions(account, roleId, rolePermissionsFormToPayload(formData));

    revalidatePath("/roles");

    return { ok: true, message: `${role.name}: ${role.permissionCodes.length} permission(s) saved.` };
  } catch (error) {
    const appError = toAppError(error);

    return {
      ok: false,
      message:
        appError.code === "VALIDATION_ERROR" ||
        appError.code === "CONFLICT" ||
        appError.code === "AUTHORIZATION_ERROR" ||
        appError.code === "NOT_FOUND"
          ? appError.message
          : "Unable to save the role right now.",
    };
  }
}
