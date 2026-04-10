"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, Zap, WalletCards } from "lucide-react";
import { combinarClases } from "@/lib/utiles";

const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
  { href: "/configuracion", etiqueta: "Config", icono: Settings },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacionInferior() {
  const pathname = usePathname();
  const enRegistroRapido = pathname === "/anotador-rapido";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="mx-auto max-w-[1160px] px-3 pb-safe pt-3">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-1.5">
            {enlaces.map(({ href, etiqueta, icono: Icono }) => {
              const activa = estaActiva(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={etiqueta}
                  title={etiqueta}
                  className={combinarClases(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold transition",
                    activa
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                  )}
                >
                  <Icono className="h-4 w-4" />
                  <span>{etiqueta}</span>
                </Link>
              );
            })}

            <Link
              href="/anotador-rapido"
              aria-label="Registro rapido"
              title="Registro rapido"
              className={combinarClases(
                "inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700",
                enRegistroRapido && "bg-slate-900 shadow-slate-900/25 hover:bg-slate-800",
              )}
            >
              <Zap className="h-5 w-5" />
            </Link>
          </div>

          <div className="mt-2 px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {enRegistroRapido ? "Registro rapido" : "Menu principal"}
          </div>
        </div>
      </div>
    </nav>
  );
}
