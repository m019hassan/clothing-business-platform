import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createPromotion } from "@/modules/catalog/application/promotions";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();
    const body = await request.json().catch(() => null);
    const promotion = await createPromotion(account, body);

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
