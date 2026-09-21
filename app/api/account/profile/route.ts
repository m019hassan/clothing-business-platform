import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/modules/customers/application/profile";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await requireAuthenticated();
    const profile = await getCustomerProfile(account);

    return NextResponse.json({ profile });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const profile = await updateCustomerProfile(account, payload);

    return NextResponse.json({ profile });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
