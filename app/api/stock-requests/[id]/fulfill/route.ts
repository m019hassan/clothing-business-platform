import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { fulfillStockRequest } from "@/modules/inventory/application/stock-requests";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const { locale } = await getInterfaceLanguage();
    const stockRequest = await fulfillStockRequest(account, id, body, locale === "en" ? "en" : "ar");

    return NextResponse.json({ request: stockRequest });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
