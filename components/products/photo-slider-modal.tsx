"use client";

import { useEffect } from "react";

/**
 * The full-screen photo slider both the thumbnail and the grid open. It keeps its own
 * overlay, arrows, counter and Escape handling.
 */
export function PhotoSliderModal({
  imageIds,
  index,
  alt,
  closeLabel,
  previousLabel,
  nextLabel,
  onIndexChange,
  onClose,
  viewLabel,
}: {
  imageIds: string[];
  index: number;
  alt: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  onIndexChange: (next: number) => void;
  onClose: () => void;
  viewLabel?: string;
}) {
  const total = imageIds.length;
  const hasMany = total > 1;
  const source = `/api/products/images/${imageIds[Math.min(Math.max(index, 0), total - 1)]}`;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + total) % total);
      }

      if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % total);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, total, onClose, onIndexChange]);

  if (total === 0) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={viewLabel ?? alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt={alt} className="max-h-[85vh] max-w-[85vw] rounded-2xl bg-white object-contain shadow-2xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -end-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-lg transition-colors hover:bg-slate-100"
        >
          {closeLabel}
        </button>

        {hasMany ? (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + total) % total)}
              aria-label={previousLabel}
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-bold text-slate-800 shadow-lg transition-colors hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % total)}
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
  );
}
