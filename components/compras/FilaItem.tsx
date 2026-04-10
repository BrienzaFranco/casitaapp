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
  const descripcion = item.descripcion.trim() || "Item sin descripcion";
  const textoSubcategoria = subcategoria?.nombre || categoria?.nombre || "Sin categoria";

  return (
    <button type="button" onClick={onAbrir} className="w-full text-left">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-gray-200 last:border-b-0 active:bg-gray-100">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="h-8 w-8 shrink-0 rounded flex items-center justify-center text-white text-[10px] font-semibold"
            style={{ backgroundColor: categoria?.color || "#9ca3af" }}
          >
            {(categoria?.nombre || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex flex-col">
            <p className="text-sm font-medium text-gray-900 truncate">{descripcion}</p>
            <p className="text-xs text-gray-500">{textoSubcategoria}</p>
          </div>
        </div>

        <p className="font-mono text-base text-gray-900">{formatearPeso(item.monto_resuelto)}</p>
      </div>
    </button>
  );
}
