"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { combinarClases } from "@/lib/utiles";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  anchoCompleto?: boolean;
  icono?: ReactNode;
}

const variantes: Record<Variante, string> = {
  primario: "bg-indigo-600 text-white hover:bg-indigo-700",
  secundario: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50",
  fantasma: "bg-transparent text-gray-600 hover:bg-gray-100",
  peligro: "bg-red-500 text-white hover:bg-red-600",
};

export function Boton({
  className,
  variante = "primario",
  anchoCompleto = false,
  icono,
  children,
  ...props
}: Props) {
  return (
    <button
      className={combinarClases(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantes[variante],
        anchoCompleto && "w-full",
        className,
      )}
      {...props}
    >
      {icono}
      {children}
    </button>
  );
}
