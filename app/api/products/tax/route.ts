import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { saveTaxSetting } from "@/modules/catalog/application/taxes";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new Error("Request body must be valid JSON.");
    }

    const setting = await saveTaxSetting(account, payload);

    return NextResponse.json({ setting });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
