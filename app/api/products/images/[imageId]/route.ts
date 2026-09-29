import { NextResponse } from "next/server";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import { deleteProductImage, readProductImage } from "@/modules/catalog/application/product-images";
import { toErrorResponse } from "@/src/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ imageId: string }> };

/** GET /api/products/images/:imageId - streams the photo to a signed-in viewer. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAuthenticated();
    const { imageId } = await context.params;
    const image = await readProductImage(imageId);

    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}

/** DELETE /api/products/images/:imageId - removes one photo (products.update). */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const account = await requireAuthenticated();
    const { imageId } = await context.params;

    await deleteProductImage(account, imageId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { status, body } = toErrorResponse(error);

    return NextResponse.json(body, { status });
  }
}
