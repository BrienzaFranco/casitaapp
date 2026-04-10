"use client";

import type { Categoria, ItemEditable, Subcategoria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  item: ItemEditable;
  categoria: Categoria | null;
  subcategoria: Subcategoria | null;
  onAbrir: () => void;
}

export function FilaItem({ item, categoria, subcategoria, onAbrir }: Props) {
  const descripcion = item.descripcion.trim() || "Fila sin descripcion";
  const textoSecundario = subcategoria?.nombre || categoria?.nombre || "Sin categoria";
  const expresion = item.expresion_monto.trim();

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 text-left transition hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{descripcion}</p>
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-gray-500">{textoSecundario}</p>
          {expresion ? (
            <span className="truncate rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              {expresion}
            </span>
          ) : null}
        </div>
      </div>
      <p className="font-mono text-sm font-bold text-gray-900">{formatearPeso(item.monto_resuelto)}</p>
    </button>
  );
}
