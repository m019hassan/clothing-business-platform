"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "@/modules/customers/application/addresses";
import { toAppError } from "@/src/lib/errors";

export type AddressFormState = {
  ok: boolean;
  message: string;
};

function failure(error: unknown): AddressFormState {
  const appError = toAppError(error);

  return {
    ok: false,
    message:
      appError.code === "VALIDATION_ERROR" ||
      appError.code === "AUTHORIZATION_ERROR" ||
      appError.code === "NOT_FOUND"
        ? appError.message
        : "Unable to save the address right now.",
  };
}

function revalidateAddresses() {
  revalidatePath("/account");
  revalidatePath("/checkout");
}

/** Reads the address fields shared by the create form. */
function addressFormToPayload(formData: FormData): Record<string, unknown> {
  const value = (key: string) => {
    const raw = formData.get(key);

    return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
  };

  return {
    label: value("label"),
    recipientName: value("recipientName") ?? "",
    phone: value("phone") ?? "",
    line1: value("line1") ?? "",
    line2: value("line2"),
    city: value("city") ?? "",
    region: value("region"),
    postalCode: value("postalCode"),
    country: value("country") ?? "SA",
    isDefault: formData.get("isDefault") === "on",
  };
}

export async function createAddressAction(
  _previousState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  try {
    const account = await requireAuthenticated();
    await createAddress(account, addressFormToPayload(formData));
  } catch (error) {
    return failure(error);
  }

  revalidateAddresses();
  return { ok: true, message: "Address saved." };
}

export async function setDefaultAddressAction(
  _previousState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const addressId = formData.get("addressId");

  try {
    const account = await requireAuthenticated();

    if (typeof addressId !== "string" || addressId.length === 0) {
      throw new Error("Missing address id");
    }

    await updateAddress(account, addressId, { isDefault: true });
  } catch (error) {
    return failure(error);
  }

  revalidateAddresses();
  return { ok: true, message: "Default address updated." };
}

export async function deleteAddressAction(
  _previousState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const addressId = formData.get("addressId");

  try {
    const account = await requireAuthenticated();

    if (typeof addressId !== "string" || addressId.length === 0) {
      throw new Error("Missing address id");
    }

    await deleteAddress(account, addressId);
  } catch (error) {
    return failure(error);
  }

  revalidateAddresses();
  return { ok: true, message: "Address removed." };
}
