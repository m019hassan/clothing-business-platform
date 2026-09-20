import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/modules/notification/application/notifications";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await requireAuthenticated();
    const preferences = await getNotificationPreferences(account);

    return NextResponse.json({ preferences });
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

    const body = (payload ?? {}) as Record<string, unknown>;
    const preference = await updateNotificationPreference(account, body.type as string, body.inApp as boolean);

    return NextResponse.json({ preference });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
