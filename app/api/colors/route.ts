import { NextResponse } from "next/server";

import { toErrorResponse } from "@/src/lib/errors";
import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { createColorOption, listColorOptions } from "@/modules/catalog/application/colors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ colors: await listColorOptions() });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const color = await createColorOption(await requireAuthenticated(), payload);

    return NextResponse.json({ color }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
