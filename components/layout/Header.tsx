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
    <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
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
                className="mb-2 inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </button>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">CasitaApp</p>
            <h1 className="text-2xl font-bold text-slate-950">Gastos domesticos</h1>
            <p className="text-sm text-slate-600">{descripcionRuta(pathname)}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/configuracion"
              aria-label="Configuracion"
              title="Configuracion"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <Boton
              variante="fantasma"
              onClick={cerrarSesion}
              icono={<LogOut className="h-4 w-4" />}
              className="min-h-10 rounded-2xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 sm:px-4"
            >
              <span className="hidden sm:inline">Cerrar sesion</span>
            </Boton>
          </div>
        </div>

        {cargando ? (
          <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Activo</p>
              <p className="text-sm font-semibold text-slate-900">{perfil?.nombre ?? "Sin nombre"}</p>
              <p className="text-xs text-slate-500">{correo}</p>
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <Link
                href="/anotador-rapido"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Anotar rapido
              </Link>
              <Link
                href="/nueva-compra"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Carga completa
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="hidden px-3 py-3 md:block">
        <nav className="flex flex-wrap items-center gap-2">
          {enlaces.map(({ href, etiqueta }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={combinarClases(
                  "inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition",
                  activa
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800",
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
