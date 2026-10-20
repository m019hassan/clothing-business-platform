"use client";

import { useState } from "react";

import { PhotoSliderModal } from "@/components/products/photo-slider-modal";
import { SearchIcon } from "@/components/ui/icons";

/** Storefront gallery: a thumbnail rail beside the big photo, tapping opens the slider. */
export function ProductGallery({
  imageIds,
  alt,
  labels,
}: {
  imageIds: string[];
  alt: string;
  labels: { view: string; close: string; previous: string; next: string };
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  if (imageIds.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-100 text-5xl font-bold text-slate-300">
        {alt.slice(0, 1)}
      </div>
    );
  }

  const safeIndex = Math.min(index, imageIds.length - 1);

  return (
    <>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:w-20 sm:flex-col sm:overflow-visible sm:pb-0">
          {imageIds.map((imageId, position) => (
            <button
              key={imageId}
              type="button"
              onClick={() => setIndex(position)}
              aria-pressed={position === safeIndex}
              aria-label={`${alt} ${position + 1}`}
              className={[
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition-colors sm:h-20 sm:w-20",
                position === safeIndex ? "border-slate-900" : "border-transparent hover:border-slate-300",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/products/images/${imageId}`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative aspect-square flex-1 overflow-hidden rounded-2xl bg-slate-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/products/images/${imageIds[safeIndex]}`}
            alt={alt}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-3 end-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm">
            <SearchIcon className="h-4 w-4" />
          </span>
        </button>
      </div>

      {open ? (
        <PhotoSliderModal
          imageIds={imageIds}
          index={safeIndex}
          alt={alt}
          viewLabel={labels.view}
          closeLabel={labels.close}
          previousLabel={labels.previous}
          nextLabel={labels.next}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
