/**
 * Pure FormData -> service payload mapper for the branch screens, kept free of
 * database access so it can be unit tested.
 */
export function branchFormToPayload(
  formData: FormData,
  { partial }: { partial: boolean },
): Record<string, unknown> {
  const text = (key: string): string | null => {
    const value = formData.get(key);

    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length === 0 ? null : trimmed;
  };

  const payload: Record<string, unknown> = {};

  if (!partial || formData.has("code")) payload.code = text("code") ?? "";
  if (!partial || formData.has("name")) payload.name = text("name") ?? "";
  if (!partial || formData.has("phone")) payload.phone = text("phone");
  if (!partial || formData.has("city")) payload.city = text("city");
  if (!partial || formData.has("address")) payload.address = text("address");
  // The form always renders the checkbox plus a hidden companion, so an absent
  // checkbox means "deactivate" rather than "not part of this submission".
  if (!partial || formData.has("isActiveProvided")) {
    payload.isActive = formData.get("isActive") === "on";
  }

  // Warehouses are submitted as repeated checkboxes; the service replaces the set.
  payload.warehouseIds = formData
    .getAll("warehouseIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  return payload;
}
