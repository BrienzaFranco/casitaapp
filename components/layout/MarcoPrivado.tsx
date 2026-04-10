"use client";

import type { ReactNode } from "react";
import { AccionesRapidas } from "@/components/layout/AccionesRapidas";
import { BannerPendientes } from "@/components/layout/BannerPendientes";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { NavegacionInferior } from "@/components/layout/NavegacionInferior";

interface Props {
  children: ReactNode;
}

export function MarcoPrivado({ children }: Props) {
  return (
    <>
      <ContenedorPagina>
        <BannerPendientes />
        <AccionesRapidas />
        {children}
      </ContenedorPagina>
      <NavegacionInferior />
    </>
  );
}
