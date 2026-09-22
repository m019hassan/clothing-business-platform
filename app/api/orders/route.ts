import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createOrderFromCart,
  listOrders,
} from "@/modules/order/application/orders";
import { toErrorResponse } from "@/src/lib/errors";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePaginationParams(searchParams);
    const page = await listOrders(account, pagination);

    return NextResponse.json(page);
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    // The body is optional: `{ addressId }` links a delivery address to the order.
    let payload: unknown = {};

    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const body = (payload ?? {}) as Record<string, unknown>;
    const addressId = typeof body.addressId === "string" && body.addressId.length > 0
      ? body.addressId
      : undefined;

    const order = await createOrderFromCart(account, addressId ? { addressId } : {});

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
