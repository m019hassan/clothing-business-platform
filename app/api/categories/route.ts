import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createCategory,
  listCategories,
} from "@/modules/catalog/application/categories";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
    const categories = await listCategories({ includeInactive });

    return NextResponse.json({ categories });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireAuthenticated();

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON.");
    }

    const category = await createCategory(account, payload);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
