"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, Plus, FileClock } from "lucide-react";
import { combinarClases } from "@/lib/utiles";
import { usarCompras } from "@/hooks/usarCompras";

const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/borradores", etiqueta: "Borradores", icono: FileClock },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
  { href: "/configuracion", etiqueta: "Config", icono: Settings },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacionInferior() {
  const pathname = usePathname();
  const compras = usarCompras();
  const cantBorradores = compras.compras.filter(c => c.estado === "borrador").length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="w-full px-2 pb-safe">
        <div className="rounded-t-2xl border-t border-outline-variant/15 bg-surface/90 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-around">
            {enlaces.map(({ href, etiqueta, icono: Icono }) => {
              const activa = estaActiva(pathname, href);
              const esBorradores = href === "/borradores";

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={etiqueta}
                  className={combinarClases(
                    "flex flex-col items-center gap-0.5 py-3 px-1 text-[9px] font-bold uppercase tracking-tight transition-colors flex-1 relative",
                    activa ? "text-secondary" : "text-on-surface-variant/70"
                  )}
                >
                  <Icono className="h-5 w-5" strokeWidth={activa ? 2 : 1.5} />
                  <span>{etiqueta}</span>
                  {esBorradores && cantBorradores > 0 && (
                    <span className="absolute -top-0.5 right-1 bg-secondary text-on-secondary text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cantBorradores}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
