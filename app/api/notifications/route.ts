import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { listNotifications } from "@/modules/notification/application/notifications";
import { toErrorResponse } from "@/src/lib/errors";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const searchParams = new URL(request.url).searchParams;
    const page = await listNotifications(account, parsePaginationParams(searchParams));

    return NextResponse.json(page);
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
