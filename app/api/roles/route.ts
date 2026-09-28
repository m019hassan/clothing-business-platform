import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createRole,
  listPermissionCatalog,
  listRolesWithPermissions,
} from "@/modules/employees/application/role-permissions";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuthenticated();
    const [roles, catalog] = await Promise.all([listRolesWithPermissions(), listPermissionCatalog()]);

    return NextResponse.json({ roles, catalog });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/** POST /api/roles - creates an empty role (roles.create). */
export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const role = await createRole(account, payload);

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
