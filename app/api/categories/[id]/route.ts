import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { updateCategory } from "@/modules/catalog/application/categories";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const { id } = await context.params;
    const category = await updateCategory(account, id, payload);

    return NextResponse.json({ category });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
