"use client";

import { useMemo } from "react";
import type { Compra, Item } from "@/types";
import { formatearPeso, formatearFecha } from "@/lib/formatear";
import { ChevronRight } from "lucide-react";

interface Props {
  titulo: string;
  compras: Compra[];
  nombres: { franco: string; fabiola: string };
  onItemClick: (item: Item, nombreLugar: string, fechaCompra: string, compraId: string) => void;
}

export function VistaDetalle({ titulo, compras, nombres, onItemClick }: Props) {
  const itemsPlanos = useMemo(() => {
    const items: Array<{ item: Item; lugar: string; fecha: string; compraId: string; pagador: string }> = [];
    for (const compra of compras) {
      for (const item of compra.items) {
        items.push({
          item,
          lugar: compra.nombre_lugar || "Sin lugar",
          fecha: compra.fecha,
          compraId: compra.id,
          pagador: compra.pagador_general === "franco" ? nombres.franco : compra.pagador_general === "fabiola" ? nombres.fabiola : "Ambos",
        });
      }
    }
    items.sort((a, b) => b.item.monto_resuelto - a.item.monto_resuelto);
    return items;
  }, [compras, nombres]);

  const total = useMemo(() => itemsPlanos.reduce((s, i) => s + i.item.monto_resuelto, 0), [itemsPlanos]);

  return (
    <div className="space-y-3">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
        <p className="text-[10px] uppercase tracking-widest text-outline">{titulo}</p>
        <p className="font-headline text-2xl font-bold text-on-surface mt-1 tabular-nums">{formatearPeso(total)}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{itemsPlanos.length} item{itemsPlanos.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 divide-y divide-outline-variant/10">
        {itemsPlanos.map(({ item, lugar, fecha, compraId, pagador }, i) => (
          <button
            key={`${item.compra_id}-${item.id || i}`}
            type="button"
            onClick={() => onItemClick(item, lugar, fecha, compraId)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-on-surface truncate">{item.descripcion || "Sin descripci&oacute;n"}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{formatearFecha(fecha)} &middot; {lugar} &middot; Pag&oacute; {pagador}</p>
            </div>
            <div className="text-right shrink-0 flex items-center gap-1">
              <span className="text-sm font-semibold tabular-nums text-on-surface">{formatearPeso(item.monto_resuelto)}</span>
              <ChevronRight className="h-4 w-4 text-on-surface-variant/30" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
