import type { InputHTMLAttributes, ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
}

export function Input({ etiqueta, error, ayuda, className, ...props }: Props) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {etiqueta}
      </span>
      <input
        className={combinarClases(
          "w-full bg-surface-container-low border-none px-0 py-3 font-headline text-on-surface outline-none transition-all duration-200 placeholder:text-on-surface-variant/50 focus:bg-surface-container-highest focus:border-b-2 focus:border-b-primary",
          "border-b border-outline/20 focus:border-b-primary",
          error && "border-b-error focus:border-b-error",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="font-label text-xs text-error">{error}</span>
      ) : null}
      {!error && ayuda ? (
        <span className="font-label text-[10px] text-on-surface-variant">{ayuda}</span>
      ) : null}
    </label>
  );
}
