import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { exportPosSaleCsv } from "@/modules/pos/application/pos-export";
import { toErrorResponse } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

/** One counter sale as a CSV sheet of its line items. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAuthenticated();
    const { t } = await getInterfaceLanguage();
    const { id } = await context.params;

    const csv = await exportPosSaleCsv(account, id, t.posExport);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice-${id}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
