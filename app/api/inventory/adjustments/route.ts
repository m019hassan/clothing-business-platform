import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { adjustStock } from "@/modules/inventory/application/movements";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";
import { announceRestock } from "@/modules/inventory/application/stock-alerts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const adjustment = await adjustStock(account, payload);

    if (typeof (payload as Record<string, unknown>).quantityChange === "number" && Number((payload as Record<string, unknown>).quantityChange) > 0) {
      await announceRestock(adjustment.variantId).catch(() => undefined);
    }

    return NextResponse.json({ adjustment }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
