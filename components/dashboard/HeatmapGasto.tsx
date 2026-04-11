"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import type { PuntoTendenciaDiaria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  tendenciaDiariaMes: PuntoTendenciaDiaria[];
  mesLabel: string;
}

function getIntensityColor(value: number, max: number): string {
  if (value === 0) return "var(--surface-container-lowest)";
  const ratio = value / max;
  if (ratio < 0.2) return "var(--success-container)";
  if (ratio < 0.4) return "var(--success)";
  if (ratio < 0.6) return "var(--tertiary-container)";
  if (ratio < 0.8) return "var(--tertiary)";
  return "var(--error)";
}

export function HeatmapGasto({ tendenciaDiariaMes, mesLabel }: Props) {
  const [hoverCell, setHoverCell] = useState<{ fecha: string; total: number } | null>(null);

  const datos = useMemo(() => {
    if (!tendenciaDiariaMes.length) return { semanas: [] as Array<Array<{ fecha: string; total: number; diaSemana: number }>>, max: 1 };

    // Build a map of date → total
    const porDia = new Map<string, number>();
    for (const punto of tendenciaDiariaMes) {
      porDia.set(punto.fecha, punto.total);
    }

    // Get the month range
    const fechas = tendenciaDiariaMes.map(p => p.fecha).sort();
    const primeraFecha = fechas[0];
    const ultimaFecha = fechas[fechas.length - 1];

    if (!primeraFecha || !ultimaFecha) return { semanas: [], max: 1 };

    // Build all days in the month
    const primerDia = new Date(`${primeraFecha}T00:00:00`);
    const ultimoDia = new Date(`${ultimaFecha}T00:00:00`);

    const semanas: Array<Array<{ fecha: string; total: number; diaSemana: number }>> = [];
    let semanaActual: Array<{ fecha: string; total: number; diaSemana: number }> = [];

    // Pad starting week to Sunday
    const diaInicio = primerDia.getDay(); // 0=Sun
    const fechaInicio = new Date(primerDia);
    fechaInicio.setDate(fechaInicio.getDate() - diaInicio);

    const fecha = new Date(fechaInicio);
    while (fecha <= ultimoDia || semanaActual.length > 0) {
      const fechaStr = fecha.toISOString().slice(0, 10);
      const total = porDia.get(fechaStr) ?? 0;
      const mesMatch = fecha.getMonth() === primerDia.getMonth();

      semanaActual.push({
        fecha: fechaStr,
        total: mesMatch ? total : 0,
        diaSemana: fecha.getDay(),
      });

      if (semanaActual.length === 7) {
        semanas.push(semanaActual);
        semanaActual = [];
      }

      fecha.setDate(fecha.getDate() + 1);
      if (fecha > ultimoDia && semanaActual.length === 0) break;
    }
    if (semanaActual.length > 0) semanas.push(semanaActual);

    return { semanas, max: Math.max(...tendenciaDiariaMes.map(p => p.total), 1) };
  }, [tendenciaDiariaMes]);

  if (!tendenciaDiariaMes.length || datos.semanas.length === 0) {
    return null;
  }

  const { semanas, max } = datos;

  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Mapa de calor semanal
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Intensidad de gasto por día — {mesLabel}
          {hoverCell && hoverCell.total > 0 && (
            <span className="ml-2 tabular-nums">
              · {hoverCell.fecha} → {formatearPeso(hoverCell.total)}
            </span>
          )}
        </p>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex gap-0.5 min-w-fit">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {diasSemana.map(d => (
              <div key={d} className="h-5 w-8 flex items-center justify-end">
                <span className="font-label text-[8px] text-on-surface-variant">{d}</span>
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-0.5">
            {semanas.map((semana, si) => (
              <div key={si} className="flex flex-col gap-0.5">
                {semana.map((dia, di) => (
                  <div
                    key={`${si}-${di}`}
                    className="h-5 w-5 rounded-sm transition-all hover:ring-1 hover:ring-outline hover:scale-110 cursor-pointer"
                    style={{
                      backgroundColor: getIntensityColor(dia.total, max),
                    }}
                    onMouseEnter={() => setHoverCell({ fecha: dia.fecha, total: dia.total })}
                    onMouseLeave={() => setHoverCell(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="font-label text-[9px] text-on-surface-variant">Menos</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(ratio => (
            <div
              key={ratio}
              className="h-3.5 w-3.5 rounded-sm"
              style={{ backgroundColor: getIntensityColor(ratio * max, max) }}
            />
          ))}
          <span className="font-label text-[9px] text-on-surface-variant">Más</span>
        </div>
      </div>
    </section>
  );
}
