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
  primario: "bg-gradient-to-b from-primary to-primary-container text-on-primary hover:from-primary/90 hover:to-primary-container/90 active:scale-[0.98]",
  secundario: "bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:scale-[0.98]",
  fantasma: "bg-transparent text-on-surface-variant hover:bg-surface-container active:scale-[0.98]",
  peligro: "bg-error text-on-error hover:bg-error/90 active:scale-[0.98]",
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
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold font-headline transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
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
