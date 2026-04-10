"use client";

import { LogOut } from "lucide-react";
import { Boton } from "@/components/ui/Boton";
import { Skeleton } from "@/components/ui/Skeleton";
import { usarUsuario } from "@/hooks/usarUsuario";

export function Header() {
  const { perfil, correo, cargando, cerrarSesion } = usarUsuario();

  return (
    <header className="rounded-[28px] border border-gray-100 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">CasitaApp</p>
          <h1 className="text-2xl font-bold text-gray-950">Gastos domesticos</h1>
          {cargando ? (
            <Skeleton className="mt-2 h-4 w-32" />
          ) : (
            <div className="text-left">
              <p className="text-base font-semibold text-gray-800">{perfil?.nombre ?? "Sin nombre"}</p>
              <p className="text-sm text-gray-500">{correo}</p>
            </div>
          )}
        </div>

        <Boton variante="fantasma" onClick={cerrarSesion} icono={<LogOut className="h-4 w-4" />}>
          Cerrar sesion
        </Boton>
      </div>
    </header>
  );
}
