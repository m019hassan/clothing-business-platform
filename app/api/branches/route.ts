import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createBranch, listBranches } from "@/modules/branches/application/branches";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
    const branches = await listBranches(account, { includeInactive });

    return NextResponse.json({ branches });
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

    const branch = await createBranch(account, payload);

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
