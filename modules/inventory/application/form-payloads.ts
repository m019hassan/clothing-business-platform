/**
 * Pure FormData -> service payload mapper for the inventory screens, so the
 * translation stays free of database access and can be unit tested.
 */
export function adjustmentFormToPayload(formData: FormData): Record<string, unknown> {
  const variantId = formData.get("variantId");
  const quantityChange = formData.get("quantityChange");
  const reason = formData.get("reason");
  const warehouseId = formData.get("warehouseId");

  const payload: Record<string, unknown> = {
    variantId: typeof variantId === "string" ? variantId : "",
    quantityChange: typeof quantityChange === "string" && quantityChange.trim() !== ""
      ? Number(quantityChange.trim())
      : Number.NaN,
  };

  if (typeof reason === "string" && reason.trim() !== "") {
    payload.reason = reason.trim();
  }

  if (typeof warehouseId === "string" && warehouseId.length > 0) {
    payload.warehouseId = warehouseId;
  }

  return payload;
}
