import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { resolveStockAlert } from "@/modules/inventory/application/stock-alerts";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAuthenticated();
    const { id } = await params;

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const body = (payload ?? {}) as Record<string, unknown>;
    const status = body.status === "NOTIFIED" || body.status === "CANCELLED" ? body.status : null;

    if (status === null) {
      throw new ValidationError("Choose NOTIFIED or CANCELLED.");
    }

    const alert = await resolveStockAlert(account, id, status);

    return NextResponse.json({ alert });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
