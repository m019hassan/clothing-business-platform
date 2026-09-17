import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { getCart } from "@/modules/cart/application/cart-service";
import { toErrorResponse } from "@/src/lib/errors";

export async function GET() {
  try {
    const account = await requireAuthenticated();
    const cart = await getCart(account);

    return NextResponse.json({ cart });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
