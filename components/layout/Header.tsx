"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { usarUsuario } from "@/hooks/usarUsuario";

function tituloPagina(pathname: string) {
  if (pathname === "/nueva-compra") return "Carga de Gasto";
  if (pathname === "/historial") return "Historial";
  if (pathname === "/balance") return "Balance";
  if (pathname === "/configuracion") return "Configuracion";
  if (pathname === "/anotador-rapido") return "Registro Rapido";
  if (pathname === "/borradores") return "Borradores";
  return "CasitaApp";
}

function rutaVolver(pathname: string) {
  if (pathname === "/nueva-compra" || pathname === "/anotador-rapido") return "/";
  return "/";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { perfil } = usarUsuario();
  const mostrarVolver = pathname !== "/";

  if (pathname === "/anotador-rapido") {
    return null;
  }

  return (
    <header className="md:hidden sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/15">
      <div className="mx-auto max-w-xl px-4 h-14 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          {mostrarVolver ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push(rutaVolver(pathname));
              }}
              className="shrink-0 text-on-surface-variant hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="font-label text-[10px] uppercase tracking-widest text-outline truncate">
              {perfil?.nombre ?? "CasitaApp"}
            </p>
            <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface truncate">
              {tituloPagina(pathname)}
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
