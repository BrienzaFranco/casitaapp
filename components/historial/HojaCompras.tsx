"use client";

import Link from "next/link";
import type { Compra } from "@/types";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  compras: Compra[];
}

export function HojaCompras({ compras }: Props) {
  if (!compras.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 text-sm text-on-surface-variant">
        No hay compras para mostrar en la hoja.
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">Hoja de compras</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-container-low text-[9px] uppercase tracking-widest font-black text-on-surface-variant border-b border-outline-variant/30">
              <th className="px-3 py-2.5 text-left">Fecha</th>
              <th className="px-3 py-2.5 text-left border-r border-outline-variant/20">Lugar</th>
              <th className="px-3 py-2.5 text-left border-r border-outline-variant/20">Detalle item</th>
              <th className="px-3 py-2.5 text-left border-r border-outline-variant/20">Categoria</th>
              <th className="px-3 py-2.5 text-left border-r border-outline-variant/20">Subcategoria</th>
              <th className="px-3 py-2.5 text-right border-r border-outline-variant/20">Monto</th>
              <th className="px-3 py-2.5 text-left">Reparto</th>
              <th className="px-3 py-2.5 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {compras.map((compra) =>
              compra.items.map((item, idx) => (
                <tr key={`${compra.id}-${item.id}`} className="align-top hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-3 py-2 font-label text-xs tabular-nums text-on-surface-variant">
                    {idx === 0 ? formatearFecha(compra.fecha) : ""}
                  </td>
                  <td className="px-3 py-2 font-label text-xs text-on-surface border-r border-outline-variant/10">
                    {idx === 0 ? (compra.nombre_lugar || "Sin lugar") : ""}
                  </td>
                  <td className="px-3 py-2 font-headline text-xs text-on-surface border-r border-outline-variant/10">
                    {item.descripcion || "Sin detalle"}
                  </td>
                  <td className="px-3 py-2 font-label text-xs text-on-surface-variant border-r border-outline-variant/10">
                    {item.categoria?.nombre || "-"}
                  </td>
                  <td className="px-3 py-2 font-label text-xs text-on-surface-variant border-r border-outline-variant/10">
                    {item.subcategoria?.nombre || "-"}
                  </td>
                  <td className="px-3 py-2 font-label text-xs tabular-nums font-semibold text-on-surface text-right border-r border-outline-variant/10">
                    {formatearPeso(item.monto_resuelto)}
                  </td>
                  <td className="px-3 py-2 font-label text-xs text-on-surface-variant">{item.tipo_reparto}</td>
                  <td className="px-3 py-2">
                    {idx === 0 && (
                      <Link
                        href={`/nueva-compra?editar=${compra.id}`}
                        className="inline-flex h-7 items-center rounded bg-surface-container px-2 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high transition-colors"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
