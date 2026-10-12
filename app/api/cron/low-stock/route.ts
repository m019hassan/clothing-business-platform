import { NextResponse } from "next/server";

import { runLowStockSweep } from "@/modules/notification/application/low-stock";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

/** Vercel Cron calls this daily (see vercel.json); ops can call it any time. */
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;

    if (secret) {
      if (request.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json(
          { error: { code: "AUTHENTICATION_ERROR", message: "Invalid cron credentials." } },
          { status: 401 },
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: { code: "AUTHENTICATION_ERROR", message: "CRON_SECRET is not configured." } },
        { status: 401 },
      );
    }

    const result = await runLowStockSweep();

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
