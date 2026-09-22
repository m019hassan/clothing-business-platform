"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { updateDelivery } from "@/modules/delivery/application/deliveries";
import { toAppError } from "@/src/lib/errors";

export type DeliveryFormState = {
  ok: boolean;
  message: string;
};

export async function updateDeliveryAction(
  _previousState: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const deliveryId = formData.get("deliveryId");
  const status = formData.get("status");
  const carrier = formData.get("carrier");
  const trackingNumber = formData.get("trackingNumber");
  const notes = formData.get("notes");

  try {
    const account = await requireAuthenticated();

    if (typeof deliveryId !== "string" || deliveryId.length === 0) {
      throw new Error("Missing delivery id");
    }

    const payload: Record<string, unknown> = {};

    if (typeof status === "string" && status.length > 0) payload.status = status;
    if (typeof carrier === "string" && carrier.trim() !== "") payload.carrier = carrier.trim();
    if (typeof trackingNumber === "string" && trackingNumber.trim() !== "") {
      payload.trackingNumber = trackingNumber.trim();
    }
    if (typeof notes === "string" && notes.trim() !== "") payload.notes = notes.trim();

    const delivery = await updateDelivery(account, deliveryId, payload);

    revalidatePath("/deliveries");
    revalidatePath(`/orders/${delivery.orderId}`);

    return { ok: true, message: `${delivery.orderNumber} is now ${delivery.status}.` };
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
          : "Unable to update the delivery right now.",
    };
  }
}
