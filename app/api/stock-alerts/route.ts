import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createStockAlert } from "@/modules/inventory/application/stock-alerts";
import { AuthorizationError, toErrorResponse, ValidationError } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    if (account.accountType !== "CUSTOMER" || account.customerProfile === null) {
      throw new AuthorizationError("Cart actions are available to customer accounts only.");
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const body = (payload ?? {}) as Record<string, unknown>;
    const { locale } = await getInterfaceLanguage();

    const alert = await createStockAlert(
      {
        variantId: typeof body.variantId === "string" ? body.variantId : "",
        contact: typeof body.contact === "string" ? body.contact : "",
      },
      locale,
    );

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
