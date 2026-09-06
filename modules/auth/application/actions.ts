"use server";

import { redirect } from "next/navigation";

import { login } from "@/modules/auth/application/login";
import { destroyCurrentSession } from "@/modules/auth/infrastructure/session";
import { toAppError } from "@/src/lib/errors";
import type { LoginResult } from "@/modules/auth/types";

export async function loginAction(
  _previousState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const identifier = formData.get("identifier");
  const password = formData.get("password");

  if (typeof identifier !== "string" || typeof password !== "string") {
    return { success: false, message: "Enter an email or phone number and password." };
  }

  try {
    await login({ identifier, password });
  } catch (error) {
    const appError = toAppError(error);
    return {
      success: false,
      message:
        appError.code === "VALIDATION_ERROR" || appError.code === "AUTHENTICATION_ERROR"
          ? appError.message
          : "Unable to sign in right now.",
    };
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
