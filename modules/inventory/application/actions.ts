"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { adjustmentFormToPayload } from "@/modules/inventory/application/form-payloads";
import { adjustStock } from "@/modules/inventory/application/movements";
import { toAppError } from "@/src/lib/errors";

export type AdjustmentFormState = {
  ok: boolean;
  message: string;
};

export async function adjustStockAction(
  _previousState: AdjustmentFormState,
  formData: FormData,
): Promise<AdjustmentFormState> {
  try {
    const account = await requireAuthenticated();
    const result = await adjustStock(account, adjustmentFormToPayload(formData));

    revalidatePath("/inventory");

    return {
      ok: true,
      message: `${result.sku}: on hand ${result.quantityOnHand}, available ${result.availableQuantity}.`,
    };
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
          : "Unable to record the adjustment right now.",
    };
  }
}
