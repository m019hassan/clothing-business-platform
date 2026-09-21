import { NextResponse } from "next/server";

import {
  countProducts,
  listProducts,
  parsePaginationParams,
} from "@/modules/catalog/application/products";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePaginationParams(searchParams);
    const [products, total] = await Promise.all([
      listProducts(pagination),
      countProducts(),
    ]);

    return NextResponse.json({ products, total });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
