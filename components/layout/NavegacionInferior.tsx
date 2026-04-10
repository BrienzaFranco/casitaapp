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
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-24px)] max-w-[480px] items-center justify-between rounded-[28px] border border-gray-100 bg-white/95 px-3 py-3 shadow-lg backdrop-blur">
      {enlaces.map(({ href, etiqueta, icono: Icono, destacada }) => {
        const activa = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={combinarClases(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition",
              activa ? "text-gray-950" : "text-gray-500",
              destacada && "mx-2 bg-indigo-600 text-white shadow-md",
              destacada && activa && "bg-indigo-700 text-white",
            )}
          >
            <Icono className={combinarClases("h-5 w-5", destacada && "h-6 w-6")} />
            <span className="truncate">{etiqueta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
