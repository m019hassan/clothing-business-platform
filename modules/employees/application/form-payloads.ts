/**
 * Pure FormData -> service payload mapper for the role editor, kept free of
 * database access so it can be unit tested.
 */
export function rolePermissionsFormToPayload(formData: FormData): Record<string, unknown> {
  const codes = formData
    .getAll("permissionCodes")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return { permissionCodes: [...new Set(codes)] };
}
