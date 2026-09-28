import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { readPaymentProof, uploadPaymentProof } from "@/modules/payment/application/proofs";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/src/lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/payments/:id/proof - streams the newest receipt.
 * Access: the customer who owns the order, or staff with payments.view.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;
    const proof = await readPaymentProof(account, id);

    return new NextResponse(new Uint8Array(proof.data), {
      headers: {
        "Content-Type": proof.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(proof.originalName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/payments/:id/proof - uploads a receipt (multipart/form-data, field
 * "file"). Accepted while the payment still awaits a decision and only for bank
 * transfers; see docs/06-api/endpoints.md.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { id } = await context.params;

    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw new ValidationError("The upload is larger than the allowed size.");
    }

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      throw new ValidationError("The request must be multipart/form-data with a file field.");
    }

    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("A file field is required.");
    }

    const proof = await uploadPaymentProof(account, id, {
      data: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      originalName: file.name,
    });

    return NextResponse.json({ proof }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
