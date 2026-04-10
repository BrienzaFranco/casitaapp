"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Plus, WalletCards } from "lucide-react";
import { combinarClases } from "@/lib/utiles";

const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
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
  const tituloUbicacion = enNuevaCompra ? "Nueva compra" : null;

  return (
    <nav className="border border-gray-300 bg-white p-2">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1 bg-gray-100 p-1">
          {enlaces.map(({ href, etiqueta, icono: Icono }) => {
            const activa = estaActiva(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-label={etiqueta}
                title={etiqueta}
                className={combinarClases(
                  "flex h-10 items-center justify-center gap-1 rounded px-2 text-xs font-semibold transition",
                  activa ? "bg-white text-gray-900 border border-gray-300" : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Icono className="h-4 w-4" />
                <span>{etiqueta}</span>
              </Link>
            );
          })}
        </div>

        {!enNuevaCompra ? (
          <Link
            href="/nueva-compra"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded border border-blue-700 bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        ) : null}
      </div>

      {tituloUbicacion ? (
        <div className="px-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          Viendo: {tituloUbicacion}
        </div>
      ) : null}
    </nav>
  );
}
