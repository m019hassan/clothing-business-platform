import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deleteRole, updateRole } from "@/modules/employees/application/role-permissions";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/roles/:id - renames a role or activates/deactivates it (roles.update). */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const role = await updateRole(account, id, payload);

    return NextResponse.json({ role });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/** DELETE /api/roles/:id - removes a role nobody holds (roles.delete). */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    await deleteRole(account, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
