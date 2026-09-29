"use client";

import { useEffect, useState } from "react";

/**
 * A 50x50 thumbnail that opens the photo in a popup. The overlay closes on click,
 * on the close button, and with Escape.
 */
export function ImageViewer({
  imageId,
  alt,
  viewLabel,
  closeLabel,
}: {
  imageId: string;
  alt: string;
  viewLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const source = `/api/products/images/${imageId}`;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={viewLabel}
        title={viewLabel}
        className="block h-[50px] w-[50px] shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-opacity hover:opacity-80"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source} alt={alt} className="h-[50px] w-[50px] object-cover" />
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
          </div>
        </div>
      ) : null}
    </>
  );
}
