"use client";

import { X } from "lucide-react";
import type { Compra } from "@/types";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  titulo: string;
  compras: Compra[];
  onClose: () => void;
}

export default function ModalExpensesDashboard({ titulo, compras, onClose }: Props) {
  const total = compras.reduce((a, c) => a + c.items.reduce((b, i) => b + i.monto_resuelto, 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-outline">Detalle</p>
            <p className="font-headline text-sm font-semibold text-on-surface">{titulo}</p>
            <p className="font-label text-xs text-on-surface-variant">{compras.length} compras · {formatearPeso(total)}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {compras.map(compra => (
            <div key={compra.id} className="px-2 py-2 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-headline text-xs font-semibold text-on-surface truncate">
                    {compra.nombre_lugar || "Sin lugar"}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {formatearFecha(compra.fecha)} · {compra.pagador_general === "franco" ? "Franco" : compra.pagador_general === "fabiola" ? "Fabiola" : "Ambos"}
                  </p>
                </div>
                <span className="font-label text-xs font-bold tabular-nums text-on-surface shrink-0 ml-2">
                  {formatearPeso(compra.items.reduce((a, i) => a + i.monto_resuelto, 0))}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {compra.items.map(item => (
                  <p key={item.id} className="font-label text-[9px] text-on-surface-variant pl-2">
                    {item.descripcion || "Sin detalle"} — {formatearPeso(item.monto_resuelto)}
                    {item.categoria && <span className="ml-1">({item.categoria.nombre})</span>}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
