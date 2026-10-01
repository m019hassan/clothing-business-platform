import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deleteWarehouse, updateWarehouse } from "@/modules/branches/application/warehouses";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    return NextResponse.json({ warehouse: await updateWarehouse(account, id, payload) });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    return NextResponse.json(await deleteWarehouse(account, id));
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
