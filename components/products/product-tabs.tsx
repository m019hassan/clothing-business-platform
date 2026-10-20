"use client";

import { useState } from "react";

/**
 * Storefront tabs. The copy mirrors the care, shipping and returns text the
 * system already published to customers, so nothing new is claimed here.
 */
export function ProductTabs({
  description,
  material,
  imageId,
  isArabic,
}: {
  description: string | null;
  material: string | null;
  imageId: string | null;
  isArabic: boolean;
}) {
  const [active, setActive] = useState<"details" | "material" | "shipping" | "returns">("details");

  const tabs = [
    { id: "details" as const, label: isArabic ? "التفاصيل" : "Details" },
    { id: "material" as const, label: isArabic ? "الخامة وإرشادات العناية" : "Material & Care" },
    { id: "shipping" as const, label: isArabic ? "الشحن والتوصيل" : "Shipping" },
    { id: "returns" as const, label: isArabic ? "الاستبدال والاسترجاع" : "Returns" },
  ];

  const care = isArabic
    ? [
        "غسيل آلي في ماء بارد (30 درجة مئوية كحد أقصى)",
        "يُغسل مع ألوان مماثلة مع قلب القطعة للداخل",
        "يُمنع استخدام المبيضات أو التنظيف الجاف",
        "الكي على درجة حرارة متوسطة مع تجنب الكي فوق الطبعات",
      ]
    : [
        "Machine wash cold (max 30°C)",
        "Wash inside out with similar colors",
        "Do not bleach or dry clean",
        "Medium iron, avoid ironing on prints",
      ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap gap-5 border-b border-slate-100 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                aria-pressed={active === tab.id}
                className={[
                  "relative pb-2 text-sm font-semibold transition-colors",
                  active === tab.id ? "text-slate-950" : "text-slate-400 hover:text-slate-700",
                ].join(" ")}
              >
                {tab.label}
                {active === tab.id ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-slate-950" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-4 text-sm leading-7 text-slate-600">
            {active === "details" ? (
              <p>{description ?? (isArabic ? "لا يوجد وصف مسجل لهذا المنتج بعد." : "No description has been recorded for this product yet.")}</p>
            ) : null}

            {active === "material" ? (
              <>
                <p>
                  <span className="font-semibold text-slate-800">{isArabic ? "نوع الخامة: " : "Fabric: "}</span>
                  {material ?? (isArabic ? "أقمشة عالية الجودة ومريحة للاستخدام اليومي" : "High quality premium fabric")}
                </p>
                <ul className="space-y-1.5">
                  {care.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {active === "shipping" ? (
              <>
                <p>
                  {isArabic
                    ? "توصيل سريع لجميع المحافظات والمناطق خلال 2 إلى 4 أيام عمل."
                    : "Fast shipping available to all regions within 2 to 4 business days."}
                </p>
                <p className="text-slate-500">
                  {isArabic
                    ? "يتم تأكيد الطلب فوراً وتوفير رابط تتبع مباشر مع شركة الشحن."
                    : "Orders are confirmed immediately with real-time tracking provided."}
                </p>
              </>
            ) : null}

            {active === "returns" ? (
              <>
                <p>
                  {isArabic
                    ? "إمكانية الاستبدال والاسترجاع بكل سهولة خلال 14 يوماً من استلام الطلب."
                    : "Hassle-free returns and exchanges within 14 days of delivery."}
                </p>
                <p className="text-slate-500">
                  {isArabic
                    ? "يشترط أن تكون القطعة في حالتها الأصلية مع وجود الملصقات ورمز الباركود."
                    : "Item must be unworn, undamaged, with original tags attached."}
                </p>
              </>
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
