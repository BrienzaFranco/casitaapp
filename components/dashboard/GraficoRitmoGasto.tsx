"use client";

import { Area, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { calcularGastoAcumuladoDia } from "@/lib/calculos";
import { mesLocalISO } from "@/lib/utiles";

interface Props {
  comprasMesActual: Compra[];
  comprasMesAnterior: Compra[];
  mesActual: string;
  mesAnterior: string;
}

export function GraficoRitmoGasto({ comprasMesActual, comprasMesAnterior, mesActual, mesAnterior }: Props) {
  const datos = useMemo(
    () => calcularGastoAcumuladoDia(comprasMesActual, comprasMesAnterior),
    [comprasMesActual, comprasMesAnterior],
  );

  const totalActual = datos[datos.length - 1]?.acumuladoActual ?? 0;
  const totalAnterior = datos[datos.length - 1]?.acumuladoAnterior ?? 0;
  const diff = totalActual - totalAnterior;
  const pctDiff = totalAnterior > 0 ? ((diff / totalAnterior) * 100).toFixed(0) : "—";

  // Only filter to "today" when viewing the current month
  const esMesActual = mesActual === mesLocalISO();
  const hoy = new Date();
  const diaActual = hoy.getDate();

  // When viewing current month: show up to today. Otherwise: show full month.
  const maxDia = esMesActual ? diaActual : 31;
  const datosFiltrados = datos.filter((d) => d.dia <= maxDia);
  const tieneDatosActual = comprasMesActual.length > 0;
  const tieneDatosAnterior = comprasMesAnterior.length > 0;

  if (!tieneDatosActual && !tieneDatosAnterior) {
    return null;
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Ritmo de gasto
            </h2>
            <p className="font-label text-[10px] text-on-surface-variant">
              Acumulado diario: {mesActual} vs {mesAnterior}
            </p>
          </div>
          {diff !== 0 && (
            <div className={`flex items-center gap-1 font-label text-xs font-bold tabular-nums ${diff > 0 ? "text-error" : "text-success"}`}>
              {diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {diff > 0 ? "+" : ""}{formatearPeso(diff)} ({diff > 0 ? "+" : ""}{pctDiff}%)
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="w-full" style={{ minHeight: "200px" }}>
          <ResponsiveContainer width="99%" minHeight={200}>
            <LineChart data={datosFiltrados.length > 0 ? datosFiltrados : datos} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="gradBurnActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBurnAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--on-surface-variant)" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="var(--on-surface-variant)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Día", position: "insideBottom", offset: -2, fontSize: 9, fill: "var(--on-surface-variant)" }}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => formatearPeso(Number(v))}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const diff = d.acumuladoActual - d.acumuladoAnterior;
                  const pctDiff = d.acumuladoAnterior > 0 ? ((diff / d.acumuladoAnterior) * 100).toFixed(0) : "—";
                  return (
                    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2.5 shadow-sm min-w-[180px]">
                      <p className="font-label text-[10px] font-bold text-on-surface mb-1.5">Día {d.dia}</p>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-label text-[9px] text-on-surface-variant">{mesActual}</span>
                          <span className="font-label text-[9px] tabular-nums font-bold text-primary">{formatearPeso(d.acumuladoActual)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-label text-[9px] text-on-surface-variant">{mesAnterior}</span>
                          <span className="font-label text-[9px] tabular-nums text-on-surface-variant">{formatearPeso(d.acumuladoAnterior)}</span>
                        </div>
                        <div className="border-t border-outline-variant/10 pt-0.5 flex items-center justify-between gap-3">
                          <span className="font-label text-[9px] font-bold text-on-surface">Diferencia</span>
                          <span className={`font-label text-[9px] tabular-nums font-bold ${diff > 0 ? "text-error" : "text-success"}`}>
                            {diff > 0 ? "+" : ""}{formatearPeso(diff)} ({diff > 0 ? "+" : ""}{pctDiff}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {esMesActual && <ReferenceLine x={diaActual} stroke="var(--outline-variant)" strokeDasharray="3 3" />}
              {tieneDatosActual && (
                <Area
                  type="monotone"
                  dataKey="acumuladoActual"
                  fill="url(#gradBurnActual)"
                />
              )}
              {tieneDatosAnterior && (
                <Area
                  type="monotone"
                  dataKey="acumuladoAnterior"
                  fill="url(#gradBurnAnterior)"
                />
              )}
              {tieneDatosActual && (
                <Line
                  type="monotone"
                  dataKey="acumuladoActual"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={mesActual}
                />
              )}
              {tieneDatosAnterior && (
                <Line
                  type="monotone"
                  dataKey="acumuladoAnterior"
                  stroke="var(--on-surface-variant)"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                  name={mesAnterior}
                  opacity={0.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-[var(--primary)]" />
            <span className="font-label text-[9px] text-on-surface-variant">{mesActual}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-[var(--on-surface-variant)] opacity-50" style={{ borderTop: "1px dashed" }} />
            <span className="font-label text-[9px] text-on-surface-variant">{mesAnterior}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {esMesActual && (
              <>
                <span className="w-px h-3 border-r border-outline-variant border-dashed" />
                <span className="font-label text-[9px] text-on-surface-variant">Hoy</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
