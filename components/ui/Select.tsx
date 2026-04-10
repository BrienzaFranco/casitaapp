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
    <label className="flex flex-col gap-1.5 text-left">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {etiqueta}
      </span>
      <select
        className={combinarClases(
          "w-full bg-surface-container-low border-b border-outline/20 px-0 py-2.5 font-headline text-sm text-on-surface outline-none transition-all duration-200 focus:bg-surface-container-highest focus:border-b-primary",
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
      {ayuda ? <span className="font-label text-[10px] text-on-surface-variant">{ayuda}</span> : null}
    </label>
  );
}
