"use client";

import { useEffect, useState } from "react";

import { PhotoSliderModal } from "@/components/products/photo-slider-modal";

/**
 * A 50x50 thumbnail that opens the product's photos in a popup slider. The overlay
 * closes on the backdrop, the close button or Escape, and moves between photos with
 * the arrows (buttons or the keyboard) when the product has more than one.
 */
export function ImageViewer({
  imageIds,
  alt,
  viewLabel,
  closeLabel,
  previousLabel,
  nextLabel,
  startIndex = 0,
  size = "thumbnail",
}: {
  imageIds: string[];
  alt: string;
  viewLabel: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  startIndex?: number;
  size?: "thumbnail" | "large";
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const total = imageIds.length;
  const hasMany = total > 1;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }

      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + total) % total);
      }

      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % total);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, total]);

  if (total === 0) {
    return null;
  }

  const source = `/api/products/images/${imageIds[index]}`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(Math.min(Math.max(startIndex, 0), total - 1));
          setOpen(true);
        }}
        aria-label={viewLabel}
        title={viewLabel}
        className={
          size === "large"
            ? "relative block h-40 w-full overflow-hidden bg-slate-50 transition-opacity hover:opacity-80"
            : "relative block h-[50px] w-[50px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-opacity hover:opacity-80"
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={size === "large" ? "h-40 w-full object-cover" : "h-[50px] w-[50px] object-cover"}
        />
        {hasMany ? (
          <span className="absolute bottom-0 end-0 rounded-br-lg bg-slate-900/70 px-1 text-[10px] font-medium text-white">
            {total}
          </span>
        ) : null}
      </button>

      {open ? (
        <PhotoSliderModal
          imageIds={imageIds}
          index={index}
          alt={alt}
          viewLabel={viewLabel}
          closeLabel={closeLabel}
          previousLabel={previousLabel}
          nextLabel={nextLabel}
          onIndexChange={setIndex}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
