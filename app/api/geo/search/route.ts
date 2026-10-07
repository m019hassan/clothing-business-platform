import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { mapNominatimResult } from "@/modules/checkout/application/geo";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Address autocomplete for the checkout, proxied through the server so the page keeps a
 * single origin and Nominatim gets the identifying User-Agent it asks for. Saudi
 * addresses only, Arabic names first.
 */
export async function GET(request: Request) {
  try {
    await requireAuthenticated();

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "sa");
    url.searchParams.set("accept-language", "ar,en");

    const response = await fetch(url, {
      headers: { "User-Agent": "clothing-business-platform/1.0" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const payload = (await response.json()) as { display_name?: string; address?: Record<string, string> }[];

    return NextResponse.json({ suggestions: payload.map(mapNominatimResult) });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
