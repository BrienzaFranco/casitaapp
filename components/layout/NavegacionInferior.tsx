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
  const enNuevaCompra = pathname === "/nueva-compra";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="mx-auto max-w-[480px] px-4 pb-safe pt-2">
        <div className="rounded-t-[28px] border-t border-l border-r border-outline-variant/15 bg-surface/80 p-2 backdrop-blur-md shadow-[0_-12px_32px_rgba(44,22,14,0.08)]">
          <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-1">
            {enlaces.map(({ href, etiqueta, icono: Icono }) => {
              const activa = estaActiva(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={etiqueta}
                  title={etiqueta}
                  className={combinarClases(
                    "flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[9px] font-label font-bold uppercase tracking-tighter transition-all duration-200",
                    activa
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )}
                >
                  <Icono className="h-4 w-4 stroke-[1.5]" />
                  <span>{etiqueta}</span>
                </Link>
              );
            })}

            <Link
              href="/nueva-compra"
              aria-label="Nueva compra"
              title="Nueva compra"
              className={combinarClases(
                "-mt-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-[var(--shadow-fab)] transition-all duration-200 hover:bg-secondary/90 active:scale-[0.95]",
                enNuevaCompra && "bg-primary shadow-primary/30",
              )}
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </Link>
          </div>

          <div className="mt-1.5 px-1 text-center text-[9px] font-label font-bold uppercase tracking-[0.14em] text-on-surface-variant/60">
            {enNuevaCompra ? "Nueva compra" : "Menu principal"}
          </div>
        </div>
      </div>
    </nav>
  );
}
