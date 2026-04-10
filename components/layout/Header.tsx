"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { combinarClases } from "@/lib/utiles";
import { usarUsuario } from "@/hooks/usarUsuario";

const enlaces = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/historial", etiqueta: "Historial" },
  { href: "/balance", etiqueta: "Balance" },
  { href: "/configuracion", etiqueta: "Configuracion" },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function rutaVolver(pathname: string) {
  if (pathname === "/nueva-compra" || pathname === "/anotador-rapido") {
    return "/";
  }

  return "/";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { perfil, cerrarSesion } = usarUsuario();
  const mostrarVolver = pathname !== "/";
  const esHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 bg-surface">
      <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {mostrarVolver ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push(rutaVolver(pathname));
                }
              }}
              className="shrink-0 inline-flex items-center text-on-surface-variant hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <p className="font-headline text-lg font-semibold text-on-surface truncate">
            {esHome ? "CasitaApp" : (perfil?.nombre ?? "Gastos domesticos")}
          </p>
        </div>

        <button
          type="button"
          onClick={cerrarSesion}
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Cerrar sesion"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Nav desktop - simple text links */}
      <nav className="hidden md:block max-w-[480px] mx-auto px-4 pb-2">
        <div className="flex items-center gap-6">
          {enlaces.map(({ href, etiqueta }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={combinarClases(
                  "text-sm font-medium transition-colors duration-150 pb-1 border-b-2",
                  activa
                    ? "text-on-surface border-on-surface"
                    : "text-on-surface-variant border-transparent hover:text-on-surface"
                )}
              >
                {etiqueta}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
