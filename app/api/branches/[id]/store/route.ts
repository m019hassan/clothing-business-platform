import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { ensureBranchStore } from "@/modules/branches/application/warehouses";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Creates the branch's selling store on demand (idempotent). */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;
    const store = await ensureBranchStore(account, id);

    return NextResponse.json({ store });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
