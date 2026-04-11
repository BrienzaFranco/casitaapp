"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { Compra } from "@/types";
import { analizarDeudaPorCategoria } from "@/lib/calculos";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  compras: Compra[];
  nombres: { franco: string; fabiola: string };
  onQuedarAMano?: () => void;
}

export function ResumenDeuda({ compras, nombres, onQuedarAMano }: Props) {
  const [catExpandida, setCatExpandida] = useState<string | null>(null);
  const [compraExpandida, setCompraExpandida] = useState<string | null>(null);

  const deuda = analizarDeudaPorCategoria(compras);

  let totalFrancoDebe = 0;
  let totalFabiolaDebe = 0;
  for (const cat of deuda) {
    totalFrancoDebe += cat.totalFrancoDebe;
    totalFabiolaDebe += cat.totalFabiolaDebe;
  }
  const neto = totalFabiolaDebe - totalFrancoDebe;
  const debeFabiola = neto > 0.01;
  const debeFranco = neto < -0.01;
  const montoNeto = Math.abs(neto);

  if (!deuda.length) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-2">Resumen de deuda</p>
        <p className="font-body text-sm text-tertiary">A mano. Nadie debe nada.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/10">
        <p className="font-label text-[10px] uppercase tracking-widest text-outline">Resumen de deuda</p>
        {debeFabiola && (
          <p className="font-label text-sm font-bold text-secondary mt-0.5">
            {nombres.fabiola} le debe {formatearPeso(montoNeto)} a {nombres.franco}
          </p>
        )}
        {debeFranco && (
          <p className="font-label text-sm font-bold text-secondary mt-0.5">
            {nombres.franco} le debe {formatearPeso(montoNeto)} a {nombres.fabiola}
          </p>
        )}
        {!debeFabiola && !debeFranco && (
          <p className="font-label text-sm text-tertiary mt-0.5">A mano</p>
        )}
        {onQuedarAMano && (
          <button
            type="button"
            onClick={onQuedarAMano}
            className="mt-2 h-7 px-3 rounded bg-tertiary/10 font-label text-[10px] font-bold uppercase tracking-wider text-tertiary hover:bg-tertiary/20 transition-colors"
          >
            Quedar a mano
          </button>
        )}
      </div>

      {/* Desglose por categoria */}
      <div className="divide-y divide-outline-variant/10">
        {deuda.map(cat => {
          const abierta = catExpandida === cat.categoria;
          return (
            <div key={cat.categoria}>
              <button
                type="button"
                onClick={() => setCatExpandida(abierta ? null : cat.categoria)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-label text-xs font-medium text-on-surface truncate">{cat.categoria}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cat.totalFrancoDebe > 0.01 && (
                    <span className="font-label text-[10px] tabular-nums text-secondary">{formatearPeso(cat.totalFrancoDebe)}</span>
                  )}
                  {cat.totalFabiolaDebe > 0.01 && (
                    <span className="font-label text-[10px] tabular-nums text-tertiary">{formatearPeso(cat.totalFabiolaDebe)}</span>
                  )}
                  {abierta ? <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" /> : <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant" />}
                </div>
              </button>

              {abierta && (
                <div className="px-4 pb-3 space-y-2">
                  {/* Subcategorias */}
                  {cat.subcategorias.filter(s => s.francoDebe > 0.01 || s.fabiolaDebe > 0.01).map(sub => (
                    <div key={sub.nombre} className="flex items-center justify-between text-xs">
                      <span className="font-label text-[10px] text-on-surface-variant pl-5">{sub.nombre}</span>
                      <div className="flex items-center gap-2">
                        {sub.francoDebe > 0.01 && (
                          <span className="font-label text-[10px] tabular-nums text-secondary">{nombres.franco} debe {formatearPeso(sub.francoDebe)}</span>
                        )}
                        {sub.fabiolaDebe > 0.01 && (
                          <span className="font-label text-[10px] tabular-nums text-tertiary">{nombres.fabiola} debe {formatearPeso(sub.fabiolaDebe)}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Compras que contribuyen */}
                  <div className="pt-1 border-t border-outline-variant/10">
                    {cat.compras.map(c => {
                      const abiertaCompra = compraExpandida === c.id;
                      return (
                        <div key={c.id} className="py-1">
                          <button
                            type="button"
                            onClick={() => setCompraExpandida(abiertaCompra ? null : c.id)}
                            className="w-full flex items-center justify-between text-xs hover:bg-surface-container-low/50 rounded px-1 py-0.5 transition-colors"
                          >
                            <div className="flex items-center gap-1.5">
                              {abiertaCompra ? <ChevronDown className="h-3 w-3 text-on-surface-variant" /> : <ChevronRight className="h-3 w-3 text-on-surface-variant" />}
                              <span className="font-label text-[10px] text-on-surface-variant">{formatearFecha(c.fecha)}</span>
                              <span className="font-label text-[10px] text-on-surface truncate">{c.lugar}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-label text-[10px] tabular-nums text-on-surface">{formatearPeso(c.items.reduce((a, i) => a + i.monto, 0))}</span>
                              <Link href={`/nueva-compra?editar=${c.id}`} className="text-on-surface-variant hover:text-on-surface">
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </div>
                          </button>
                          {abiertaCompra && (
                            <div className="ml-6 space-y-0.5 pt-0.5">
                              {c.items.map((item, idx) => (
                                <p key={idx} className="font-label text-[9px] text-on-surface-variant">
                                  {item.descripcion || "Sin detalle"} — {formatearPeso(item.monto)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
