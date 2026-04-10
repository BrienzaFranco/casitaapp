"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, Plus } from "lucide-react";
import { combinarClases } from "@/lib/utiles";

const enlaces = [
  { href: "/", etiqueta: "Resumen", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/nueva-compra", etiqueta: "Agregar", icono: Plus },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
  { href: "/configuracion", etiqueta: "Config", icono: Settings },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacionInferior() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="w-full px-2 pb-safe">
        <div className="rounded-t-2xl border-t border-outline-variant/15 bg-surface/90 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-around">
            {enlaces.map(({ href, etiqueta, icono: Icono }) => {
              const activa = estaActiva(pathname, href);
              const esAgregar = href === "/nueva-compra";

              if (esAgregar) {
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={etiqueta}
                    className="flex flex-col items-center -mt-4"
                  >
                    <div className="bg-secondary text-on-secondary rounded-full shadow-lg shadow-secondary/20 flex items-center justify-center active:scale-95 transition-transform"
                      style={{ width: "52px", height: "52px" }}>
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-tight text-secondary mt-1">{etiqueta}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={etiqueta}
                  className={combinarClases(
                    "flex flex-col items-center gap-0.5 py-3 px-1 text-[9px] font-bold uppercase tracking-tight transition-colors flex-1",
                    activa ? "text-secondary" : "text-on-surface-variant/70"
                  )}
                >
                  <Icono className="h-5 w-5" strokeWidth={activa ? 2 : 1.5} />
                  <span>{etiqueta}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
