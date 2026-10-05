import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/src/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string;
}

export function Input({
  className,
  leftIcon,
  rightIcon,
  error,
  type = "text",
  id,
  ...props
}: InputProps) {
  return (
    <div className="relative w-full">
      {leftIcon ? (
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
          {leftIcon}
        </div>
      ) : null}
      <input
        id={id}
        type={type}
        className={cn(
          "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-slate-900 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          leftIcon && "ps-10",
          rightIcon && "pe-10",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10",
          className,
        )}
        {...props}
      />
      {rightIcon ? (
        <div className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400">
          {rightIcon}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
