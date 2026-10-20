"use client";

import { useState } from "react";

export type ProductTabContent = {
  details: string;
  material: string | null;
  care: string[];
  shipping: string;
  returns: string;
};

/** Storefront tabs: details, material & care, and shipping/returns. */
export function ProductTabs({
  tabs,
  content,
  imageId,
  isArabic,
}: {
  tabs: { details: string; material: string; shipping: string };
  content: ProductTabContent;
  imageId: string | null;
  isArabic: boolean;
}) {
  const [active, setActive] = useState<"details" | "material" | "shipping">("details");

  const items = [
    { id: "details" as const, label: tabs.details },
    { id: "material" as const, label: tabs.material },
    { id: "shipping" as const, label: tabs.shipping },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap gap-5 border-b border-slate-100 pb-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                aria-pressed={active === item.id}
                className={[
                  "relative pb-2 text-sm font-semibold transition-colors",
                  active === item.id ? "text-slate-950" : "text-slate-400 hover:text-slate-700",
                ].join(" ")}
              >
                {item.label}
                {active === item.id ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-950" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="pt-4 text-sm leading-7 text-slate-600">
            {active === "details" ? <p>{content.details}</p> : null}

            {active === "material" ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-800">
                  {isArabic ? "الخامة:" : "Fabric:"} {content.material ?? (isArabic ? "أقمشة مختارة بعناية" : "Carefully selected fabric")}
                </p>
                <ul className="space-y-1.5">
                  {content.care.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {active === "shipping" ? (
              <div className="space-y-2">
                <p>{content.shipping}</p>
                <p className="text-slate-500">{content.returns}</p>
              </div>
            ) : null}
          </div>
        </div>

        {imageId ? (
          <div className="overflow-hidden rounded-xl bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/products/images/${imageId}`}
              alt=""
              loading="lazy"
              className="h-full max-h-72 w-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
