"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { calcularGastoAcumuladoDia } from "@/lib/calculos";

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

  // Determine how many days have passed this month
  const hoy = new Date();
  const diaActual = hoy.getDate();

  // Only show up to today's day for current month, full month for previous
  const datosFiltrados = datos.filter((d) => d.dia <= diaActual);
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
                formatter={(value, name) => [
                  formatearPeso(Number(value)),
                  name === "acumuladoActual" ? mesActual : mesAnterior,
                ]}
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "var(--outline-variant)",
                  backgroundColor: "var(--surface-container-lowest)",
                }}
              />
              <ReferenceLine x={diaActual} stroke="var(--outline-variant)" strokeDasharray="3 3" />
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
            <span className="w-px h-3 border-r border-outline-variant border-dashed" />
            <span className="font-label text-[9px] text-on-surface-variant">Hoy</span>
          </div>
        </div>
      </div>
    </section>
  );
}
