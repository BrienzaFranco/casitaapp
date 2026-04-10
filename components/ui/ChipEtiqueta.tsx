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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-label transition-all duration-200",
        activa
          ? "bg-primary text-on-primary"
          : "bg-surface-variant text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {nombre}
    </button>
  );
}
