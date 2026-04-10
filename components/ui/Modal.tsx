"use client";

import type { ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";

interface Props {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  confirmacion: string;
  cancelacion?: string;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  children?: ReactNode;
}

export function Modal({
  abierto,
  titulo,
  descripcion,
  confirmacion,
  cancelacion = "Cancelar",
  cargando = false,
  onConfirmar,
  onCancelar,
  children,
}: Props) {
  if (!abierto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/35 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-5 shadow-xl">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">{titulo}</h3>
          <p className="text-sm text-gray-500">{descripcion}</p>
          {children}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Boton variante="secundario" onClick={onCancelar}>
            {cancelacion}
          </Boton>
          <Boton variante="peligro" onClick={onConfirmar} disabled={cargando}>
            {cargando ? "Procesando..." : confirmacion}
          </Boton>
        </div>
      </div>
    </div>
  );
}
