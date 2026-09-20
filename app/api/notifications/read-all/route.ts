import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { markAllNotificationsRead } from "@/modules/notification/application/notifications";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await requireAuthenticated();
    const updated = await markAllNotificationsRead(account);

    return NextResponse.json({ updated });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
