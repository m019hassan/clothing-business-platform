import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { approvePayment } from "@/modules/payment/application/payments";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/:id/approve — staff decision on a transfer.
 * approve requires its own permission; see docs/08-api/endpoints.md.
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;
    const result = await approvePayment(account, id);

    return NextResponse.json(result);
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
