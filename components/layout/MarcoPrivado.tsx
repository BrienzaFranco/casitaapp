"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AccionesRapidas } from "@/components/layout/AccionesRapidas";
import { BannerPendientes } from "@/components/layout/BannerPendientes";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { NavegacionInferior } from "@/components/layout/NavegacionInferior";

interface Props {
  children: ReactNode;
}

export function MarcoPrivado({ children }: Props) {
  const pathname = usePathname();
  const esNuevaCompra = pathname.startsWith("/nueva-compra");

  if (esNuevaCompra) {
    return <main className="mx-auto min-h-screen w-full max-w-[480px]">{children}</main>;
  }

  return (
    <ContenedorPagina>
      <BannerPendientes />
      <AccionesRapidas />
      <NavegacionInferior />
      {children}
    </ContenedorPagina>
  );
}
