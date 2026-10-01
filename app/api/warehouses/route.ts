import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createWarehouse, listWarehouses } from "@/modules/branches/application/warehouses";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuthenticated();

    return NextResponse.json({ warehouses: await listWarehouses() });
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

    return NextResponse.json({ warehouse: await createWarehouse(account, payload) }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
