"use client";

import { useState } from "react";
import { XIcon } from "@/components/ui/icons";

export type SizeGuideRow = {
  size: string;
  chest: string;
  waist: string;
  length: string;
};

const DEFAULT_SIZES: SizeGuideRow[] = [
  { size: "S", chest: "92-96", waist: "76-80", length: "70" },
  { size: "M", chest: "96-102", waist: "80-86", length: "72" },
  { size: "L", chest: "102-108", waist: "86-92", length: "74" },
  { size: "XL", chest: "108-114", waist: "92-98", length: "76" },
  { size: "XXL", chest: "114-120", waist: "98-104", length: "78" },
];

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic?: boolean;
}

export function SizeGuideModal({ isOpen, onClose, isArabic = true }: SizeGuideModalProps) {
  const [activeUnit, setActiveUnit] = useState<"cm" | "in">("cm");

  if (!isOpen) return null;

  const toInches = (val: string) => {
    if (val.includes("-")) {
      const [min, max] = val.split("-").map(Number);
      return `${(min / 2.54).toFixed(0)}-${(max / 2.54).toFixed(0)}`;
    }
    return (Number(val) / 2.54).toFixed(1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-opacity"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isArabic ? "دليل المقاسات" : "Size Guide"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isArabic ? "قياسات تقريبية لمساعدتك في اختيار المقاس الأنسب" : "Approximate measurements to help you choose the best fit"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Unit Toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isArabic ? "وحدة القياس:" : "Measurement Unit:"}
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveUnit("cm")}
              className={`rounded-md px-3 py-1 transition-colors ${
                activeUnit === "cm"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              {isArabic ? "سم (cm)" : "cm"}
            </button>
            <button
              type="button"
              onClick={() => setActiveUnit("in")}
              className={`rounded-md px-3 py-1 transition-colors ${
                activeUnit === "in"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              {isArabic ? "بوصة (in)" : "inches"}
            </button>
          </div>
        </div>

        {/* Size Table */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-3 font-semibold">{isArabic ? "المقاس" : "Size"}</th>
                <th className="py-2.5 px-3 font-semibold">{isArabic ? "محيط الصدر" : "Chest"}</th>
                <th className="py-2.5 px-3 font-semibold">{isArabic ? "محيط الخصر" : "Waist"}</th>
                <th className="py-2.5 px-3 font-semibold">{isArabic ? "الطول" : "Length"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {DEFAULT_SIZES.map((row) => (
                <tr key={row.size} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{row.size}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {activeUnit === "cm" ? `${row.chest} سم` : `${toInches(row.chest)} in`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {activeUnit === "cm" ? `${row.waist} سم` : `${toInches(row.waist)} in`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {activeUnit === "cm" ? `${row.length} سم` : `${toInches(row.length)} in`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fitting Tip */}
        <div className="mt-4 rounded-xl bg-blue-50/70 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <p className="font-semibold">{isArabic ? "💡 نصيحة لاختيار المقاس:" : "💡 Fitting Tip:"}</p>
          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
            {isArabic
              ? "إذا كنت بين مقاسين، ننصح باختيار المقاس الأكبر لقصّة أكثر راحة، أو المقاس الأصغر لمظهر أكثر ضبطاً (Slim fit)."
              : "If you're in between sizes, order the larger size for a looser fit or the smaller size for a tighter fit."}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
