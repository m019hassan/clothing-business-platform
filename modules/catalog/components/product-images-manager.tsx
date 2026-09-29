"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { ProductImageView } from "@/modules/catalog/application/product-images";
import { apiErrorMessage, apiRequest, type ApiErrorLabels } from "@/src/lib/api";

export type ProductImagesLabels = {
  title: string;
  hint: string;
  colour: string;
  noColour: string;
  upload: string;
  uploading: string;
  uploaded: string;
  remove: string;
  removeConfirm: string;
  chooseFile: string;
  empty: string;
  errors?: ApiErrorLabels;
};

/** Uploads product photos, optionally tied to one colour of the product. */
export function ProductImagesManager({
  productId,
  images,
  variants,
  labels,
}: {
  productId: string;
  images: ProductImageView[];
  variants: { id: string; label: string }[];
  labels: ProductImagesLabels;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [variantId, setVariantId] = useState("");
  const [pending, setPending] = useState<null | "upload" | string>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setError(labels.chooseFile);
      return;
    }

    setPending("upload");
    setError(null);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("file", file);

      if (variantId) {
        form.append("variantId", variantId);
      }

      await apiRequest(`/api/products/${productId}/images`, { method: "POST", body: form });

      setMessage(labels.uploaded);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  async function remove(imageId: string) {
    if (!window.confirm(labels.removeConfirm)) {
      return;
    }

    setPending(imageId);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/products/images/${imageId}`, { method: "DELETE" });
      router.refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, labels.errors));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{labels.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{labels.hint}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{labels.colour}</span>
          <select
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          >
            <option value="">{labels.noColour}</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-xs text-slate-600 file:me-2 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700"
        />
        <button
          type="button"
          onClick={upload}
          disabled={pending !== null}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === "upload" ? labels.uploading : labels.upload}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{labels.empty}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="overflow-hidden rounded-xl border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/products/images/${image.id}`}
                alt={image.originalName}
                className="h-36 w-full bg-slate-50 object-cover"
              />
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <span className="truncate text-[11px] text-slate-500">
                  {image.variantId ? labels.colour : labels.noColour}
                </span>
                <button
                  type="button"
                  onClick={() => remove(image.id)}
                  disabled={pending !== null}
                  className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
                >
                  {labels.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
