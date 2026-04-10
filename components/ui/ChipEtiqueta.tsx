"use client";

import { combinarClases } from "@/lib/utiles";

interface Props {
  nombre: string;
  color: string;
  activa?: boolean;
  onClick?: () => void;
}

export function ChipEtiqueta({ nombre, color, activa = false, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={combinarClases(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition",
        activa ? "border-transparent bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
      )}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {nombre}
    </button>
  );
}
