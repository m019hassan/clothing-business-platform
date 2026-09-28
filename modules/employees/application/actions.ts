"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { rolePermissionsFormToPayload } from "@/modules/employees/application/form-payloads";
import {
  createRole,
  updateRolePermissions,
} from "@/modules/employees/application/role-permissions";
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

/** Creates an empty role from the roles screen (roles.create). */
export async function createRoleAction(
  _previousState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const name = formData.get("name");
  const code = formData.get("code");

  try {
    const account = await requireAuthenticated();
    const role = await createRole(account, {
      name: typeof name === "string" ? name : "",
      code: typeof code === "string" ? code : "",
    });

    revalidatePath("/roles");

    return { ok: true, message: `${role.name}: created. Grant permissions below.` };
  } catch (error) {
    const appError = toAppError(error);

    return {
      ok: false,
      message:
        appError.code === "VALIDATION_ERROR" ||
        appError.code === "CONFLICT" ||
        appError.code === "AUTHORIZATION_ERROR"
          ? appError.message
          : "Unable to create the role right now.",
    };
  }
}
