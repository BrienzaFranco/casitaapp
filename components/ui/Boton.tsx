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
  primario: "border border-blue-700 bg-blue-600 text-white shadow-[0_16px_34px_-18px_rgba(18,88,220,0.6)] hover:bg-blue-700",
  secundario: "border border-[var(--border)] bg-[var(--surface-strong)] text-slate-800 hover:bg-white",
  fantasma: "border border-transparent bg-transparent text-[var(--muted)] hover:bg-black/5 hover:text-slate-800",
  peligro: "border border-red-600 bg-red-500 text-white hover:bg-red-600",
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
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
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
