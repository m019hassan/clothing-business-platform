import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export type StatCardVariant = "default" | "blue" | "emerald" | "amber" | "rose" | "indigo";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  variant?: StatCardVariant;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

const variantIconBg: Record<StatCardVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700 border border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border border-amber-100",
  rose: "bg-rose-50 text-rose-700 border border-rose-100",
  indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  variant = "default",
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
              variantIconBg[variant],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {(hint || trend) ? (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center font-semibold",
                trend.isPositive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend.value}
            </span>
          ) : null}
          {hint ? <span className="truncate">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
