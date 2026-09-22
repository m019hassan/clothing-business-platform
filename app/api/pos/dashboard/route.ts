import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getDistributorDashboard } from "@/modules/pos/application/pos-dashboard";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await requireAuthenticated();
    const dashboard = await getDistributorDashboard(account);

    return NextResponse.json({ dashboard });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
