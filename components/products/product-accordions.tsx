"use client";

import { useState } from "react";
import { ChevronDownIcon, TruckIcon, RotateCcwIcon, LayersIcon } from "@/components/ui/icons";

interface ProductAccordionsProps {
  material?: string | null;
  isArabic?: boolean;
}

export function ProductAccordions({ material, isArabic = true }: ProductAccordionsProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    material: true,
    shipping: false,
    returns: false,
  });

  const toggle = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const items = [
    {
      id: "material",
      title: isArabic ? "الخامة وإرشادات العناية" : "Material & Care Guide",
      icon: <LayersIcon className="h-4 w-4 text-blue-600" />,
      content: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {isArabic ? "نوع الخامة:" : "Fabric:"}{" "}
            </span>
            {material || (isArabic ? "أقمشة عالية الجودة ومريحة للاستخدام اليومي" : "High quality premium fabric")}
          </p>
          <ul className="list-inside list-disc space-y-1 text-slate-500 dark:text-slate-400">
            <li>{isArabic ? "غسيل آلي في ماء بارد (30 درجة مئوية كحد أقصى)" : "Machine wash cold (max 30°C)"}</li>
            <li>{isArabic ? "يُغسل مع ألوان مماثلة مع قلب القطعة للداخل" : "Wash inside out with similar colors"}</li>
            <li>{isArabic ? "يُمنع استخدام المبيضات أو التنظيف الجاف" : "Do not bleach or dry clean"}</li>
            <li>{isArabic ? "الكي على درجة حرارة متوسطة مع تجنب الكي فوق الطبعات" : "Medium iron, avoid ironing on prints"}</li>
          </ul>
        </div>
      ),
    },
    {
      id: "shipping",
      title: isArabic ? "الشحن والتوصيل" : "Shipping & Delivery",
      icon: <TruckIcon className="h-4 w-4 text-emerald-600" />,
      content: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {isArabic
              ? "توصيل سريع لجميع المحافظات والمناطق خلال 2 إلى 4 أيام عمل."
              : "Fast shipping available to all regions within 2 to 4 business days."}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {isArabic
              ? "يتم تأكيد الطلب فوراً وتوفير رابط تتبع مباشر مع شركة الشحن."
              : "Orders are confirmed immediately with real-time tracking provided."}
          </p>
        </div>
      ),
    },
    {
      id: "returns",
      title: isArabic ? "الاستبدال والاسترجاع" : "Returns & Exchanges",
      icon: <RotateCcwIcon className="h-4 w-4 text-amber-600" />,
      content: (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            {isArabic
              ? "إمكانية الاستبدال والاسترجاع بكل سهولة خلال 14 يوماً من استلام الطلب."
              : "Hassle-free returns and exchanges within 14 days of delivery."}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {isArabic
              ? "يشترط أن تكون القطعة في حالتها الأصلية مع وجود الملصقات ورمز الباركود."
              : "Item must be unworn, undamaged, with original tags attached."}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {items.map((item, index) => {
        const isOpen = openSections[item.id];
        return (
          <div
            key={item.id}
            className={`${index !== items.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}`}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between p-4 text-start transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm text-slate-800 dark:text-slate-200">
                {item.icon}
                <span>{item.title}</span>
              </div>
              <ChevronDownIcon
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen ? (
              <div className="px-4 pb-4 pt-1">
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
