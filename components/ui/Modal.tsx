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
  abierto, titulo, descripcion, confirmacion,
  cancelacion = "Cancelar", cargando = false,
  onConfirmar, onCancelar, children,
}: Props) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-on-surface/30 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-headline text-lg font-semibold tracking-tight text-on-surface">{titulo}</h3>
          <p className="font-body text-sm text-on-surface-variant">{descripcion}</p>
          {children}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Boton variante="secundario" onClick={onCancelar} className="h-9 text-xs rounded font-headline font-semibold">
            {cancelacion}
          </Boton>
          <Boton variante="peligro" onClick={onConfirmar} disabled={cargando} className="h-9 text-xs rounded font-headline font-semibold">
            {cargando ? "Procesando..." : confirmacion}
          </Boton>
        </div>
      </div>
    </div>
  );
}
