import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createSizeOption, listSizeOptions } from "@/modules/catalog/application/sizes";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ sizes: await listSizeOptions() });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const size = await createSizeOption(await requireAuthenticated(), payload);

    return NextResponse.json({ size }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
