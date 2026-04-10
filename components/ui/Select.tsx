import type { ReactNode, SelectHTMLAttributes } from "react";
import { combinarClases } from "@/lib/utiles";

export interface OpcionSelect {
  etiqueta: string;
  valor: string;
  color?: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  opciones: OpcionSelect[];
  placeholder?: string;
  ayuda?: ReactNode;
}

export function Select({ etiqueta, opciones, placeholder, ayuda, className, ...props }: Props) {
  return (
    <label className="flex flex-col gap-2 text-left">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{etiqueta}</span>
      <div className="relative">
        <select
          className={combinarClases(
            "h-12 w-full appearance-none rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100/80",
            className,
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>
      {ayuda ? <span className="text-sm text-[var(--muted)]">{ayuda}</span> : null}
    </label>
  );
}
