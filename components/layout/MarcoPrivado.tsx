"use client";

import type { ReactNode } from "react";
import { BannerPendientes } from "@/components/layout/BannerPendientes";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { Header } from "@/components/layout/Header";
import { NavegacionInferior } from "@/components/layout/NavegacionInferior";

interface Props {
  children: ReactNode;
}

export function MarcoPrivado({ children }: Props) {
  return (
    <>
      <ContenedorPagina className="pb-24 md:pb-8">
        <Header />
        <BannerPendientes />
        {children}
      </ContenedorPagina>
      <NavegacionInferior />
    </>
  );
}
