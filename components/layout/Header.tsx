"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut, Settings } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Skeleton } from "@/components/ui/Skeleton";
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

function descripcionRuta(pathname: string) {
  if (pathname === "/nueva-compra") {
    return "Carga una compra completa con detalle, categorias y reparto.";
  }

  if (pathname === "/historial") {
    return "Filtra, revisa y edita compras cargadas.";
  }

  if (pathname === "/balance") {
    return "Seguimiento del mes, deuda abierta y cortes.";
  }

  if (pathname === "/configuracion") {
    return "Categorias, etiquetas e importaciones.";
  }

  if (pathname === "/anotador-rapido") {
    return "Captura rapida para no perder ninguna compra.";
  }

  return "Vista general del hogar y accesos rapidos.";
}

function rutaVolver(pathname: string) {
  if (pathname === "/nueva-compra" || pathname === "/anotador-rapido") {
    return "/";
  }

  if (pathname === "/configuracion") {
    return "/";
  }

  if (pathname === "/balance" || pathname === "/historial") {
    return "/";
  }

  return "/";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { perfil, correo, cargando, cerrarSesion } = usarUsuario();
  const mostrarVolver = pathname !== "/";

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/15">
      <div className="max-w-[480px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            {mostrarVolver ? (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                    return;
                  }

                  router.push(rutaVolver(pathname));
                }}
                className="inline-flex items-center gap-1 text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </button>
            ) : (
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                CasitaApp
              </p>
            )}
            <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              Gastos domesticos
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/configuracion"
              aria-label="Configuracion"
              title="Configuracion"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant transition-all duration-200 hover:bg-surface-container-high hover:text-on-surface"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <Boton
              variante="fantasma"
              onClick={cerrarSesion}
              icono={<LogOut className="h-4 w-4" />}
              className="h-10 rounded-xl px-3"
            >
              <span className="hidden sm:inline font-label text-xs uppercase tracking-wider">Cerrar sesion</span>
            </Boton>
          </div>
        </div>

        {cargando ? (
          <Skeleton className="mt-3 h-11 w-full rounded-xl" />
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-tertiary">Activo</p>
              <p className="font-headline text-sm font-semibold text-on-surface">{perfil?.nombre ?? "Sin nombre"}</p>
              <p className="font-label text-xs text-on-surface-variant">{correo}</p>
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <Link
                href="/anotador-rapido"
                className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2.5 text-sm font-semibold font-headline text-on-secondary transition-all duration-200 hover:bg-secondary/90 active:scale-[0.98]"
              >
                Anotar rapido
              </Link>
              <Link
                href="/nueva-compra"
                className="inline-flex items-center justify-center rounded-md border border-outline-variant/30 bg-surface-container-high px-4 py-2.5 text-sm font-semibold font-headline text-on-surface transition-all duration-200 hover:bg-surface-container-highest active:scale-[0.98]"
              >
                Carga completa
              </Link>
            </div>
          </div>
        )}

        <nav className="hidden md:flex flex-wrap items-center gap-2 mt-3">
          {enlaces.map(({ href, etiqueta }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={combinarClases(
                  "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold font-headline transition-all duration-200",
                  activa
                    ? "bg-primary text-on-primary"
                    : "bg-surface-variant text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
