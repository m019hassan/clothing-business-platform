import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listOrderRefunds, refundOrder } from "@/modules/payment/application/refunds";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Refunds recorded for an order (any account that can view the order). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticated();
    const { id } = await context.params;

    return NextResponse.json({ refunds: await listOrderRefunds(id) });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/orders/:id/refund - records a refund for a collected payment.
 * Needs payments.refund; see docs/06-api/endpoints.md.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    let payload: unknown = {};

    try {
      const text = await request.text();

      if (text.trim().length > 0) {
        payload = JSON.parse(text);
      }
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const result = await refundOrder(account, id, payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
