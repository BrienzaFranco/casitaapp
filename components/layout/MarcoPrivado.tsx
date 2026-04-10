"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BannerPendientes } from "@/components/layout/BannerPendientes";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { Header } from "@/components/layout/Header";
import { NavegacionInferior } from "@/components/layout/NavegacionInferior";

interface Props {
  children: ReactNode;
}

export function MarcoPrivado({ children }: Props) {
  const pathname = usePathname();
  const esNuevaCompra = pathname.startsWith("/nueva-compra");

  if (esNuevaCompra) {
    return <main className="mx-auto min-h-screen w-full max-w-[1160px]">{children}</main>;
  }

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
