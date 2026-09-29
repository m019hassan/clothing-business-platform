import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listPosSales } from "@/modules/pos/application/pos-returns";
import { createPosSale } from "@/modules/pos/application/pos-sales";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

/** GET /api/pos/sales - the branch's counter sales, newest first (distributor only). */
export async function GET() {
  try {
    const account = await requireAuthenticated();

    return NextResponse.json({ sales: await listPosSales(account) });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const receipt = await createPosSale(account, payload);

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
