// Enhanced photo slider modal with richer UI and touch support
"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";

/**
 * Full‑screen photo slider opened from the thumbnail. Includes:
 * • Keyboard navigation (Escape, ArrowLeft/Right)
 * • Touch/swipe support for mobile
 * • Styled navigation arrows using our icon library
 * • Hover zoom effect on the image
 * • Background blur and focus trap‑like click handling
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

  // Touch handling state
  const stripRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchThreshold = 50; // minimal px swipe to trigger change

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > touchThreshold) {
      if (diff > 0) {
        // swipe right → previous
        onIndexChange((index - 1 + total) % total);
      } else {
        // swipe left → next
        onIndexChange((index + 1) % total);
      }
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + total) % total);
      } else if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % total);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, total, onClose, onIndexChange]);

  // Keep the active thumbnail in the middle of the strip without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);

    if (strip && active) {
      strip.scrollTo({
        left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2,
        behavior: "smooth",
      });
    }
  }, [index, imageIds.length]);

  if (total === 0) return null;

  // The portal keeps the overlay at the document root: the product card animates with a
  // transform, and a transformed ancestor would otherwise trap this fixed overlay inside
  // the card itself.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={viewLabel ?? alt}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
    >
      <div
        className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative max-h-[80vh] max-w-[90vw]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
        {/* Image with subtle hover zoom */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={alt}
          className="max-h-[78vh] max-w-[90vw] rounded-2xl bg-white object-contain shadow-2xl transition-transform duration-300 ease-out hover:scale-105"
        />

        {/* Close button – use XIcon for consistency */}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute -top-3 -end-3 rounded-full bg-white p-1.5 shadow-lg hover:bg-slate-100"
        >
          <XIcon className="h-5 w-5 text-slate-800" />
        </button>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + total) % total)}
              aria-label={previousLabel}
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"
            >
              <ChevronLeftIcon className="h-6 w-6 text-slate-800" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % total)}
              aria-label={nextLabel}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white"
            >
              <ChevronRightIcon className="h-6 w-6 text-slate-800" />
            </button>
            <p className="absolute bottom-3 start-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-white">
              {index + 1} / {total}
            </p>
          </>
        )}
        </div>

        {/* Responsive thumbnail rail: swipeable on a phone, click to jump anywhere. */}
        {hasMany ? (
          <div
            ref={stripRef}
            className="flex max-w-[90vw] gap-2 overflow-x-auto rounded-xl bg-slate-900/60 p-2"
            role="tablist"
            aria-label={viewLabel ?? alt}
          >
            {imageIds.map((imageId, position) => (
              <button
                key={imageId}
                type="button"
                data-thumb={position}
                role="tab"
                aria-selected={position === index}
                onClick={() => onIndexChange(position)}
                className={[
                  "h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition",
                  position === index
                    ? "border-white opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/products/images/${imageId}`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
