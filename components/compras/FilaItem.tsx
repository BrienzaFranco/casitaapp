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
  const colorCategoria = categoria?.color || "#9ca3af";

  return (
    <button type="button" onClick={onAbrir} className="flex items-center justify-between gap-3 rounded-2xl p-3 transition hover:bg-gray-50 active:bg-gray-100">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: colorCategoria }}>
          <span className="text-xs font-semibold">{(categoria?.nombre || "?").slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{descripcion}</p>
          <p className="text-xs text-gray-500">{textoSubcategoria}</p>
        </div>
      </div>
      <p className="font-mono text-base font-bold text-gray-900">{formatearPeso(item.monto_resuelto)}</p>
    </button>
  );
}
