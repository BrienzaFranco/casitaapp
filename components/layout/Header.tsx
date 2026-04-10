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
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function tituloPagina(pathname: string) {
  if (pathname === "/nueva-compra") return "Carga de Gasto";
  if (pathname === "/historial") return "Historial";
  if (pathname === "/balance") return "Balance";
  if (pathname === "/configuracion") return "Configuracion";
  if (pathname === "/anotador-rapido") return "Registro Rapido";
  return "CasitaApp";
}

function rutaVolver(pathname: string) {
  if (pathname === "/nueva-compra" || pathname === "/anotador-rapido") return "/";
  return "/";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { perfil, cerrarSesion } = usarUsuario();
  const mostrarVolver = pathname !== "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/15">
      <div className="mx-auto max-w-4xl px-4 h-14 flex justify-between items-center">
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

        <button
          type="button"
          onClick={cerrarSesion}
          className="shrink-0 h-9 w-9 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Cerrar sesion"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:block mx-auto max-w-4xl px-4 pb-2">
        <div className="flex items-center gap-5">
          {enlaces.map(({ href, etiqueta }) => {
            const activa = estaActiva(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={combinarClases(
                  "text-sm font-medium pb-0.5 border-b-2 transition-colors duration-150",
                  activa
                    ? "text-secondary border-secondary"
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
