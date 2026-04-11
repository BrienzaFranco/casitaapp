"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Home, Settings, WalletCards, FileClock, LogOut, LayoutDashboard } from "lucide-react";
import { combinarClases } from "@/lib/utiles";
import { usarCompras } from "@/hooks/usarCompras";
import { usarUsuario } from "@/hooks/usarUsuario";

const enlaces = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: WalletCards },
  { href: "/borradores", etiqueta: "Borradores", icono: FileClock },
  { href: "/dashboard", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/balance", etiqueta: "Balance", icono: ChartColumn },
  { href: "/configuracion", etiqueta: "Config", icono: Settings },
];

function estaActiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarDesktop() {
  const pathname = usePathname();
  const compras = usarCompras();
  const usuario = usarUsuario();
  const cantBorradores = compras.compras.filter(c => c.estado === "borrador").length;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-surface-container-low border-r border-outline-variant/15 z-40">
      {/* Logo / App name */}
      <div className="px-4 pt-6 pb-4 border-b border-outline-variant/10">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline">CasitaApp</p>
        <p className="font-headline text-sm font-semibold text-on-surface truncate mt-0.5">{usuario.perfil?.nombre ?? ""}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {enlaces.map(({ href, etiqueta, icono: Icono }) => {
          const activa = estaActiva(pathname, href);
          const esBorradores = href === "/borradores";

          return (
            <Link
              key={href}
              href={href}
              className={combinarClases(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors relative",
                activa
                  ? "bg-secondary/10 text-secondary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <Icono className="h-4 w-4 shrink-0" strokeWidth={activa ? 2 : 1.5} />
              <span className="font-label text-xs font-bold uppercase tracking-wider">{etiqueta}</span>
              {esBorradores && cantBorradores > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary text-on-secondary text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cantBorradores}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-outline-variant/10">
        <button
          type="button"
          onClick={usuario.cerrarSesion}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-label text-xs font-bold uppercase tracking-wider">Salir</span>
        </button>
      </div>
    </aside>
  );
}
