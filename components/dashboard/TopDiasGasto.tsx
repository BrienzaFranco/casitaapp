"use client";

import { CalendarDays } from "lucide-react";
import type { DiaGasto, Compra } from "@/types";
import { formatearFecha, formatearPeso } from "@/lib/formatear";

interface Props {
  diasMasGasto: DiaGasto[];
  comprasMes: Compra[];
}

export function TopDiasGasto({ diasMasGasto, comprasMes }: Props) {
  if (!diasMasGasto.length) {
    return null;
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Días pico de gasto
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Los 5 días con mayor gasto del mes
        </p>
      </div>

      <div className="divide-y divide-outline-variant/10">
        {diasMasGasto.map((dia, i) => {
          // Find the main place(s) for that day
          const comprasDelDia = comprasMes.filter(c => c.fecha === dia.fecha);
          const lugares = [...new Set(comprasDelDia.map(c => c.nombre_lugar).filter(Boolean))];

          return (
            <div key={dia.fecha} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-label text-[10px] font-bold text-on-surface-variant w-5 text-right tabular-nums">
                  #{i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-label text-xs font-semibold text-on-surface">
                    {formatearFecha(dia.fecha)}
                  </p>
                  {lugares.length > 0 && (
                    <p className="font-label text-[9px] text-on-surface-variant truncate">
                      {lugares.slice(0, 2).join(", ")}
                      {lugares.length > 2 && ` +${lugares.length - 2}`}
                    </p>
                  )}
                </div>
              </div>
              <span className="font-label text-sm font-bold tabular-nums text-on-surface shrink-0 ml-2">
                {formatearPeso(dia.total)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
