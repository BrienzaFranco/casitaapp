"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, Plus } from "lucide-react";
import { combinarClases } from "@/lib/utiles";

const enlaces = [
  { href: "/", etiqueta: "Resumen", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
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
      <div className="w-full px-3 pb-safe pt-1.5">
        <div className="rounded-t-2xl border-t border-outline-variant/15 bg-surface/80 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-end justify-around px-1 pt-1 pb-1">
            {enlaces.map(({ href, etiqueta, icono: Icono }) => {
              const activa = estaActiva(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={etiqueta}
                  className={combinarClases(
                    "flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-tight transition-colors flex-1",
                    activa ? "text-secondary" : "text-stone-500"
                  )}
                >
                  <Icono className="h-5 w-5" strokeWidth={activa ? 2 : 1.5} />
                  <span>{etiqueta}</span>
                </Link>
              );
            })}
          </div>

          {/* FAB */}
          <div className="flex justify-center -mt-6 mb-1.5">
            <Link
              href="/nueva-compra"
              aria-label="Nueva compra"
              className="bg-primary text-on-primary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
              style={{ width: "52px", height: "52px" }}
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
