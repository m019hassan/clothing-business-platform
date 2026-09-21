"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { updateCustomerProfile } from "@/modules/customers/application/profile";
import { toAppError } from "@/src/lib/errors";

export type ProfileFormState = {
  ok: boolean;
  message: string;
};

export async function updateProfileAction(
  _previousState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const gender = formData.get("gender");
  const birthDate = formData.get("birthDate");

  try {
    const account = await requireAuthenticated();

    await updateCustomerProfile(account, {
      firstName: typeof firstName === "string" ? firstName : "",
      lastName: typeof lastName === "string" && lastName.trim() !== "" ? lastName : null,
      gender: typeof gender === "string" && gender !== "" ? gender : null,
      birthDate: typeof birthDate === "string" && birthDate !== "" ? birthDate : null,
    });
  } catch (error) {
    const appError = toAppError(error);

    return {
      ok: false,
      message:
        appError.code === "VALIDATION_ERROR" || appError.code === "AUTHORIZATION_ERROR"
          ? appError.message
          : "Unable to save your profile right now.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}
