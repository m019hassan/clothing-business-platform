import { NextResponse } from "next/server";

import {
  countProducts,
  listProducts,
  parsePaginationParams,
  parseProductListFilters,
} from "@/modules/catalog/application/products";
import {
  createProduct,
} from "@/modules/catalog/application/product-management";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePaginationParams(searchParams);
    const filters = parseProductListFilters(searchParams);
    const [products, total] = await Promise.all([
      listProducts(pagination, filters),
      countProducts(filters),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const product = await createProduct(await requireAuthenticated(), payload);

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
