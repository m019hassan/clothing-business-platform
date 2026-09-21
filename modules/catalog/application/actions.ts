"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticated } from "@/modules/auth/infrastructure/session";
import {
  createCategory,
  updateCategory,
} from "@/modules/catalog/application/categories";
import {
  categoryFormToPayload,
  productFormToPayload,
  variantFormToPayload,
} from "@/modules/catalog/application/form-payloads";
import {
  archiveProduct,
  archiveVariant,
  createProduct,
  createVariant,
  updateProduct,
  updateVariant,
} from "@/modules/catalog/application/product-management";
import type { CatalogFormState } from "@/modules/catalog/types";
import { toAppError } from "@/src/lib/errors";

function failure(error: unknown): CatalogFormState {
  const appError = toAppError(error);

  return {
    ok: false,
    message:
      appError.code === "VALIDATION_ERROR" ||
      appError.code === "CONFLICT" ||
      appError.code === "AUTHORIZATION_ERROR" ||
      appError.code === "NOT_FOUND"
        ? appError.message
        : "Unable to save your changes right now.",
  };
}

function revalidateCatalog(productId?: string) {
  revalidatePath("/products");

  if (productId) {
    revalidatePath(`/products/${productId}`);
    revalidatePath(`/products/${productId}/edit`);
  }
}

export async function createProductAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  let createdId: string;

  try {
    const account = await requireAuthenticated();
    const product = await createProduct(account, productFormToPayload(formData, { partial: false }));
    createdId = product.id;
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(createdId);
  redirect(`/products/${createdId}/edit`);
}

export async function updateProductAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const productId = formData.get("productId");

  try {
    const account = await requireAuthenticated();

    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error("Missing product id");
    }

    await updateProduct(account, productId, productFormToPayload(formData, { partial: true }));
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(typeof productId === "string" ? productId : undefined);
  return { ok: true, message: "Product updated." };
}

export async function archiveProductAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const productId = formData.get("productId");

  try {
    const account = await requireAuthenticated();

    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error("Missing product id");
    }

    await archiveProduct(account, productId);
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(typeof productId === "string" ? productId : undefined);
  return { ok: true, message: "Product archived." };
}

export async function createVariantAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const productId = formData.get("productId");

  try {
    const account = await requireAuthenticated();

    if (typeof productId !== "string" || productId.length === 0) {
      throw new Error("Missing product id");
    }

    await createVariant(account, productId, variantFormToPayload(formData, { partial: false }));
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(typeof productId === "string" ? productId : undefined);
  return { ok: true, message: "Variant added." };
}

export async function updateVariantAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const productId = formData.get("productId");
  const variantId = formData.get("variantId");

  try {
    const account = await requireAuthenticated();

    if (typeof productId !== "string" || typeof variantId !== "string") {
      throw new Error("Missing variant id");
    }

    await updateVariant(account, productId, variantId, variantFormToPayload(formData, { partial: true }));
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(typeof productId === "string" ? productId : undefined);
  return { ok: true, message: "Variant updated." };
}

export async function archiveVariantAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const productId = formData.get("productId");
  const variantId = formData.get("variantId");

  try {
    const account = await requireAuthenticated();

    if (typeof productId !== "string" || typeof variantId !== "string") {
      throw new Error("Missing variant id");
    }

    await archiveVariant(account, productId, variantId);
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog(typeof productId === "string" ? productId : undefined);
  return { ok: true, message: "Variant archived." };
}

export async function createCategoryAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  try {
    const account = await requireAuthenticated();
    await createCategory(account, categoryFormToPayload(formData, { partial: false }));
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog();
  return { ok: true, message: "Category created." };
}

export async function toggleCategoryAction(
  _previousState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const categoryId = formData.get("categoryId");
  const isActive = formData.get("isActive") === "true";

  try {
    const account = await requireAuthenticated();

    if (typeof categoryId !== "string" || categoryId.length === 0) {
      throw new Error("Missing category id");
    }

    await updateCategory(account, categoryId, { isActive });
  } catch (error) {
    return failure(error);
  }

  revalidateCatalog();
  return { ok: true, message: isActive ? "Category activated." : "Category deactivated." };
}
