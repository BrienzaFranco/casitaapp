"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, Plus } from "lucide-react";
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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="mx-auto max-w-[480px]">
        {/* Flat bar - no rounded container, no glassmorphism */}
        <div className="bg-surface border-t border-outline-variant/20 flex items-center">
          {enlaces.map(({ href, etiqueta, icono: Icono }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-label={etiqueta}
                className={combinarClases(
                  "flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-medium transition-colors",
                  activa
                    ? "text-primary"
                    : "text-on-surface-variant"
                )}
              >
                <Icono className="h-5 w-5 stroke-[1.5]" />
                <span className="mt-0.5">{etiqueta}</span>
              </Link>
            );
          })}

          <Link
            href="/nueva-compra"
            aria-label="Nueva compra"
            className="flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-medium text-secondary"
          >
            <Plus className="h-5 w-5 stroke-[2]" />
            <span className="mt-0.5">Agregar</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
