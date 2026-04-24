"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, FileClock, LayoutDashboard, Plus } from "lucide-react";
import { combinarClases } from "@/lib/utiles";
import { useDraftCount } from "@/hooks/usarCompras";

const enlacesIzq = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/borradores", etiqueta: "Borradores", icono: FileClock },
];

const enlacesDer = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
  { href: "/configuracion", etiqueta: "Config", icono: Settings },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavegacionInferior() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: cantBorradores = 0 } = useDraftCount();

  if (pathname === "/anotador-rapido") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="relative w-full bg-surface border-t border-outline-variant/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex items-end justify-around h-16">
          {enlacesIzq.map(({ href, etiqueta, icono: Icono }) => {
            const activa = estaActiva(pathname, href);
            const esBorradores = href === "/borradores";

            return (
              <Link
                key={href}
                href={href}
                aria-label={etiqueta}
                className={combinarClases(
                  "flex flex-col items-center justify-center gap-0.5 pb-2 flex-1 transition-colors relative min-h-[48px]",
                  activa ? "text-secondary" : "text-on-surface-variant/70"
                )}
              >
                <Icono className="h-5 w-5" strokeWidth={activa ? 2 : 1.5} />
                <span className="text-[9px] font-bold uppercase tracking-tight leading-none">{etiqueta}</span>
                {esBorradores && cantBorradores > 0 && (
                  <span className="absolute top-0 right-2 bg-error text-on-error text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cantBorradores > 9 ? "9+" : cantBorradores}
                  </span>
                )}
              </Link>
            );
          })}

          {/* FAB integrated into nav flow */}
          <div className="flex-1 flex items-center justify-center pb-2 -mt-6">
            <button
              type="button"
              onClick={() => router.push("/anotador-rapido")}
              aria-label="Registro rapido"
              className="flex items-center justify-center w-[52px] h-[52px] rounded-full bg-secondary text-on-secondary shadow-lg shadow-secondary/30 hover:bg-secondary/90 active:scale-[0.95] transition-all"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>

          {enlacesDer.map(({ href, etiqueta, icono: Icono }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-label={etiqueta}
                className={combinarClases(
                  "flex flex-col items-center justify-center gap-0.5 pb-2 flex-1 transition-colors min-h-[48px]",
                  activa ? "text-secondary" : "text-on-surface-variant/70"
                )}
              >
                <Icono className="h-5 w-5" strokeWidth={activa ? 2 : 1.5} />
                <span className="text-[9px] font-bold uppercase tracking-tight leading-none">{etiqueta}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
