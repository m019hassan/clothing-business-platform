import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { addProductImage, listProductImages } from "@/modules/catalog/application/product-images";
import { toErrorResponse, ValidationError } from "@/src/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/src/lib/storage";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/products/:id/images - the product's photos (any signed-in account). */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticated();
    const { id } = await context.params;

    return NextResponse.json({ images: await listProductImages(id) });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/**
 * POST /api/products/:id/images - uploads one photo (products.update).
 * multipart/form-data: `file`, and an optional `variantId` to tie it to a colour.
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

    const variantId = form.get("variantId");
    const image = await addProductImage(
      account,
      id,
      {
        data: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        originalName: file.name,
      },
      typeof variantId === "string" && variantId.length > 0 ? variantId : null,
    );

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
