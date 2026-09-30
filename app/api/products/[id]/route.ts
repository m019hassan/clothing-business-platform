import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  deleteProduct,
  updateProduct,
} from "@/modules/catalog/application/product-management";
import { getProduct } from "@/modules/catalog/application/products";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const product = await getProduct(id);

    return NextResponse.json({ product });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const { id } = await context.params;
    const product = await updateProduct(await requireAuthenticated(), id, payload);

    return NextResponse.json({ product });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticated();
    const { id } = await context.params;
    const removed = await deleteProduct(await requireAuthenticated(), id);

    return NextResponse.json({ removed });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
