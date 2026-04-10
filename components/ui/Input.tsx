import type { InputHTMLAttributes, ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
}

export function Input({ etiqueta, error, ayuda, className, ...props }: Props) {
  return (
    <label className="flex flex-col gap-2 text-left">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{etiqueta}</span>
      <input
        className={combinarClases(
          "h-12 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-slate-900 outline-none transition placeholder:text-[color:rgba(102,95,85,0.7)] focus:border-blue-500 focus:ring-4 focus:ring-blue-100/80",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-red-500">{error}</span> : null}
      {!error && ayuda ? <span className="text-sm text-[var(--muted)]">{ayuda}</span> : null}
    </label>
  );
}
