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
      <span className="text-sm font-semibold text-gray-800">{etiqueta}</span>
      <div className="relative">
        <select
          className={combinarClases(
            "h-12 w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
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
      {ayuda ? <span className="text-sm text-gray-500">{ayuda}</span> : null}
    </label>
  );
}
