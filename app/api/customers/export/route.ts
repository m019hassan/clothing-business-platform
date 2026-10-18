import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  exportCustomersCsv,
  parseCustomerListFilters,
} from "@/modules/customers/application/customers";
import { toErrorResponse } from "@/src/lib/errors";
import { getInterfaceLanguage } from "@/src/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAuthenticated();
    const filters = parseCustomerListFilters(new URL(request.url).searchParams);
    const { t } = await getInterfaceLanguage();

    const csv = await exportCustomersCsv(account, filters, {
      code: t.customers.csvCode,
      name: t.customers.csvName,
      phone: t.customers.csvPhone,
      email: t.customers.csvEmail,
      classification: t.customers.csvClassification,
      orders: t.customers.csvOrders,
      marketingConsent: t.customers.csvConsent,
      marketingYes: t.customers.csvYes,
      marketingNo: t.customers.csvNo,
      joined: t.customers.csvJoined,
    });

    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
