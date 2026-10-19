import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { updateCashierDiscount } from "@/modules/pos/application/cashiers";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

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
    const canDiscount = body.canDiscount === true;
    const discountCode = typeof body.discountCode === "string" ? body.discountCode : null;
    const discountPercent = typeof body.discountPercent === "number" ? body.discountPercent : null;

    const cashier = await updateCashierDiscount(account, id, { canDiscount, discountCode, discountPercent });

    return NextResponse.json({ cashier });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
