import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { lookupPosCustomer } from "@/modules/pos/application/pos-customers";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const phone = new URL(request.url).searchParams.get("phone") ?? "";
    const customer = await lookupPosCustomer(account, phone);

    return NextResponse.json({ customer });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
