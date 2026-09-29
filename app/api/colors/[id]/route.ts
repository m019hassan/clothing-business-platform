import { NextResponse } from "next/server";

import { toErrorResponse } from "@/src/lib/errors";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deleteColorOption } from "@/modules/catalog/application/colors";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    return NextResponse.json(await deleteColorOption(await requireAuthenticated(), id));
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
