import { NextResponse } from "next/server";

import { requirePermission } from "@/modules/auth/application/authorization";
import { PERMISSIONS } from "@/modules/auth/application/permissions";
import { listPendingPayments } from "@/modules/payment/application/payments";
import { toErrorResponse } from "@/src/lib/errors";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

/** Queue of orders waiting for a payment decision (payments.view). */
export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSIONS.PAYMENTS_VIEW);

    const searchParams = new URL(request.url).searchParams;
    const page = await listPendingPayments(parsePaginationParams(searchParams));

    return NextResponse.json(page);
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
