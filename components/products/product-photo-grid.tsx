"use client";

import { useState } from "react";

import { PhotoSliderModal } from "@/components/products/photo-slider-modal";

const MAX_TILES = 4;

/**
 * A product's photos as a compact grid: every tile is a clear cover crop, and when the
 * product has more than four photos the last tile carries "+N" (N = the photos beyond
 * the four). Any tile opens the shared slider at its own position.
 */
export function ProductPhotoGrid({
  imageIds,
  alt,
  labels,
  className = "h-40",
}: {
  imageIds: string[];
  alt: string;
  labels: { view: string; close: string; previous: string; next: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (imageIds.length === 0) {
    return null;
  }

  const visible = imageIds.slice(0, MAX_TILES);
  const hidden = Math.max(imageIds.length - MAX_TILES, 0);
  // Three photos read best as two tiles above one wide tile; two sit side by side.
  const spansLast = imageIds.length === 3;

  const openAt = (position: number) => {
    setIndex(position);
    setOpen(true);
  };

  return (
    <>
      <div
        className={[
          "grid grid-cols-2 gap-0.5 overflow-hidden bg-slate-100",
          imageIds.length === 2 ? "grid-rows-1" : "grid-rows-2",
          className,
        ].join(" ")}
      >
        {imageIds.length === 1 ? (
          <button
            type="button"
            onClick={() => openAt(0)}
            aria-label={labels.view}
            className="relative h-full w-full overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/products/images/${visible[0]}`} alt={alt} className="h-full w-full object-cover" />
          </button>
        ) : (
          visible.map((imageId, position) => {
            const isLastTile = position === visible.length - 1;
            const showMore = isLastTile && hidden > 0;

            return (
              <button
                key={imageId}
                type="button"
                onClick={() => openAt(position)}
                aria-label={labels.view}
                className={[
                  "relative h-full w-full overflow-hidden",
                  spansLast && isLastTile ? "col-span-2" : "",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/products/images/${imageId}`} alt={alt} className="h-full w-full object-cover" />
                {showMore ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-lg font-bold text-white">
                    +{hidden}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {open ? (
        <PhotoSliderModal
          imageIds={imageIds}
          index={index}
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
