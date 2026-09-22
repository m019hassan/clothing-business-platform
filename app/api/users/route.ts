import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createUser,
  listUsers,
  parseUserListFilters,
} from "@/modules/users/application/users";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";
import { parsePaginationParams } from "@/src/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePaginationParams(searchParams);
    const filters = parseUserListFilters(searchParams);
    const page = await listUsers(account, pagination, filters);

    return NextResponse.json(page);
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

    const user = await createUser(account, payload);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
