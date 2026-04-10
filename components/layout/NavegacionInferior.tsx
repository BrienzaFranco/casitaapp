"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Plus, WalletCards } from "lucide-react";
import { combinarClases } from "@/lib/utiles";

const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/nueva-compra", etiqueta: "Nueva", icono: Plus, destacada: true },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
];

export function NavegacionInferior() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-2 z-40 mx-auto flex w-[calc(100%-16px)] max-w-[480px] items-center justify-between rounded-2xl border border-gray-200 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur">
      {enlaces.map(({ href, etiqueta, icono: Icono, destacada }) => {
        const activa = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={combinarClases(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold transition",
              activa ? "text-gray-900" : "text-gray-500",
              destacada && "mx-1 bg-indigo-600 text-white",
              destacada && activa && "bg-indigo-700 text-white",
            )}
          >
            <Icono className={combinarClases("h-[18px] w-[18px]", destacada && "h-5 w-5")} />
            <span className="hidden truncate sm:inline">{etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
