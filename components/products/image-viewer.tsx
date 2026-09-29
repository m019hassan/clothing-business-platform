"use client";

import { useEffect, useState } from "react";

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
          className={size === "large" ? "h-40 w-full object-cover" : "h-[50px] w-[50px] object-cover"}
        />
        {hasMany ? (
          <span className="absolute bottom-0 end-0 rounded-br-lg bg-slate-900/70 px-1 text-[10px] font-medium text-white">
            {total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewLabel}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source}
              alt={alt}
              className="max-h-[85vh] max-w-[85vw] rounded-2xl bg-white object-contain shadow-2xl"
            />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -end-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-lg transition-colors hover:bg-slate-100"
            >
              {closeLabel}
            </button>

            {hasMany ? (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((current) => (current - 1 + total) % total)}
                  aria-label={previousLabel}
                  className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition-colors hover:bg-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((current) => (current + 1) % total)}
                  aria-label={nextLabel}
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition-colors hover:bg-white"
                >
                  ›
                </button>
                <p className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white">
                  {index + 1} / {total}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
