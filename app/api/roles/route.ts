import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  listPermissionCatalog,
  listRolesWithPermissions,
} from "@/modules/employees/application/role-permissions";
import { toErrorResponse } from "@/src/lib/errors";

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
