"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { usarUsuario } from "@/hooks/usarUsuario";

export function AccionesRapidas() {
  const { cerrarSesion } = usarUsuario();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/configuracion"
        aria-label="Configuracion"
        title="Configuracion"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={cerrarSesion}
        aria-label="Cerrar sesion"
        title="Cerrar sesion"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
