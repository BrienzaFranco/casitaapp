"use client";

import type { ReactNode } from "react";
import { BannerPendientes } from "@/components/layout/BannerPendientes";
import { ChatGlobal } from "@/components/layout/ChatGlobal";
import { ContenedorPagina } from "@/components/layout/ContenedorPagina";
import { Header } from "@/components/layout/Header";
import { NavegacionInferior } from "@/components/layout/NavegacionInferior";
import { SidebarDesktop } from "@/components/layout/SidebarDesktop";

interface Props {
  children: ReactNode;
}

export function MarcoPrivado({ children }: Props) {
  return (
    <>
      <SidebarDesktop />
      <div className="md:pl-56">
        <ContenedorPagina className="pb-24 md:pb-8 md:pt-6">
          <Header />
          <BannerPendientes />
          {children}
        </ContenedorPagina>
        <NavegacionInferior />
        <ChatGlobal />
      </div>
    </>
  );
}
