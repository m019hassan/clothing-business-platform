import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/src/lib/logger";

/**
 * Next 16 calls this hook "proxy" (the former middleware convention).
 * Gives every request a correlation id (returned as `x-request-id` so a browser or
 * a client can quote it) and writes one structured request line. Failures are
 * logged separately by the error helper with their own error id.
 */
export default function proxy(request: NextRequest): NextResponse {
  const requestId = crypto.randomUUID().slice(0, 12);
  const response = NextResponse.next();

  response.headers.set("x-request-id", requestId);

  logger.info("request", {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return response;
}

export const config = {
  // Skip static assets so the log stays about real traffic.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
