import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { exportPosSalesCsv } from "@/modules/pos/application/pos-export";
import { toErrorResponse } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

/** The branch's counter sales as a CSV sheet for the accountant. */
export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const { t } = await getInterfaceLanguage();

    const rawLimit = new URL(request.url).searchParams.get("limit");
    const parsedLimit = rawLimit === null ? undefined : Number(rawLimit);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;

    const csv = await exportPosSalesCsv(account, t.posExport, limit);

    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pos-invoices-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
