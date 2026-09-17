import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  addItem,
  parseQuantityInput,
} from "@/modules/cart/application/cart-service";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const body = (payload ?? {}) as Record<string, unknown>;
    const variantId = typeof body.variantId === "string" ? body.variantId : "";
    const quantity = parseQuantityInput(body.quantity);

    const cart = await addItem(account, { variantId, quantity });

    return NextResponse.json({ cart }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
