import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deleteBranch } from "@/modules/branches/application/branches";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    return NextResponse.json(await deleteBranch(account, id));
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
