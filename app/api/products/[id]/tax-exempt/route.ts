import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { setProductTaxExemption } from "@/modules/catalog/application/taxes";
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

    if (typeof body.taxExempt !== "boolean") {
      throw new ValidationError("taxExempt must be true or false.");
    }

    const product = await setProductTaxExemption(account, id, body.taxExempt);

    return NextResponse.json({ product });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
