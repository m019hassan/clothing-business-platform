import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createStockRequest } from "@/modules/inventory/application/stock-requests";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();
    const body = await request.json().catch(() => null);
    const stockRequest = await createStockRequest(account, body);

    return NextResponse.json({ request: stockRequest }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
