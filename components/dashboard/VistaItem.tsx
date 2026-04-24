"use client";

import Link from "next/link";
import { Pencil, MapPin, CalendarDays } from "lucide-react";
import type { Item } from "@/types";
import { formatearPeso, formatearFecha } from "@/lib/formatear";

interface Props {
  item: Item;
  nombreLugar: string;
  fechaCompra: string;
  compraId: string;
  nombres: { franco: string; fabiola: string };
}

export function VistaItem({ item, nombreLugar, fechaCompra, compraId, nombres }: Props) {
  return (
    <div className="space-y-3">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
        <p className="font-headline text-lg font-semibold text-on-surface">{item.descripcion || "Sin descripcion"}</p>
        <p className="font-headline text-3xl font-bold text-on-surface mt-1 tabular-nums">{formatearPeso(item.monto_resuelto)}</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-on-surface">
          <CalendarDays className="h-4 w-4 text-on-surface-variant shrink-0" />
          <span>{formatearFecha(fechaCompra)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-on-surface">
          <MapPin className="h-4 w-4 text-on-surface-variant shrink-0" />
          <span>{nombreLugar || "Sin lugar"}</span>
        </div>
        <div className="flex gap-2 pt-1">
          {item.categoria && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 text-white"
              style={{ backgroundColor: item.categoria.color || "#666" }}>
              {item.categoria.nombre}
            </span>
          )}
          {item.subcategoria && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 bg-surface-container-high text-on-surface-variant">
              {item.subcategoria.nombre}
            </span>
          )}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-outline">Reparto</p>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Tipo</span>
          <span className="font-medium text-on-surface">
            {item.tipo_reparto === "50/50" ? "50/50 compartido" :
             item.tipo_reparto === "solo_franco" ? `Solo ${nombres.franco}` :
             item.tipo_reparto === "solo_fabiola" ? `Solo ${nombres.fabiola}` :
             "Personalizado"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">{nombres.franco} pag&oacute;</span>
          <span className="font-medium text-on-surface tabular-nums">{formatearPeso(item.pago_franco)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">{nombres.fabiola} pag&oacute;</span>
          <span className="font-medium text-on-surface tabular-nums">{formatearPeso(item.pago_fabiola)}</span>
        </div>
      </div>

      <Link
        href={`/nueva-compra?editar=${compraId}`}
        className="flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary text-on-secondary font-label text-xs font-bold uppercase tracking-wider hover:bg-secondary/90 active:scale-[0.98] transition-all"
      >
        <Pencil className="h-4 w-4" /> Editar compra
      </Link>
    </div>
  );
}
