import { NextResponse } from "next/server";

import { listAuditActions, listAuditLog } from "@/modules/audit/application/audit-log";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { toErrorResponse } from "@/src/lib/errors";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/audit - the audit trail, newest first (audit.view). */
export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const searchParams = new URL(request.url).searchParams;
    const action = searchParams.get("action")?.trim() || undefined;
    const entity = searchParams.get("entity")?.trim() || undefined;

    if (searchParams.get("actions") === "1") {
      return NextResponse.json({ actions: await listAuditActions(account) });
    }

    const page = await listAuditLog(account, parsePaginationParams(searchParams), { action, entity });

    return NextResponse.json(page);
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
