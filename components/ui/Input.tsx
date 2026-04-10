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
      <span className="text-sm font-semibold text-gray-800">{etiqueta}</span>
      <input
        className={combinarClases(
          "h-12 rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-red-500">{error}</span> : null}
      {!error && ayuda ? <span className="text-sm text-gray-500">{ayuda}</span> : null}
    </label>
  );
}
