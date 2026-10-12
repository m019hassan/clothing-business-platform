import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deletePromotion, setPromotionActive } from "@/modules/catalog/application/promotions";
import { ValidationError, toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { isActive?: unknown } | null;

    if (typeof body?.isActive !== "boolean") {
      throw new ValidationError("isActive must be a boolean.");
    }

    const promotion = await setPromotionActive(account, id, body.isActive);

    return NextResponse.json({ promotion });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    await deletePromotion(account, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
