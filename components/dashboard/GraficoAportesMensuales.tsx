"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BalanceMensualFila } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  historico: BalanceMensualFila[];
  nombres: { franco: string; fabiola: string };
  colorFran: string;
  colorFabi: string;
}

function formatearMesCorto(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

export function GraficoAportesMensuales({ historico, nombres, colorFran, colorFabi }: Props) {
  const datos = useMemo(() => {
    // Take last 6 months
    return historico.slice(-6).map((fila) => {
      const total = fila.franco + fila.fabiola;
      return {
        mes: fila.mes,
        franco: fila.franco,
        fabiola: fila.fabiola,
        total,
        pctFranco: total > 0 ? (fila.franco / total) * 100 : 0,
        pctFabiola: total > 0 ? (fila.fabiola / total) * 100 : 0,
      };
    });
  }, [historico]);

  if (!datos.length) {
    return null;
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Aportes mensuales
        </h2>
        <p className="font-label text-[10px] text-on-surface-variant">
          {nombres.franco} vs {nombres.fabiola} — últimos 6 meses
        </p>
      </div>

      <div className="p-4">
        <div className="w-full" style={{ minHeight: "200px" }}>
          <ResponsiveContainer width="99%" minHeight={200}>
            <BarChart data={datos} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
              <XAxis
                dataKey="mes"
                tick={({ x, y, payload }) => (
                  <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={9} fill="var(--on-surface-variant)">
                    {formatearMesCorto(payload.value)}
                  </text>
                )}
                tickLine={false}
                axisLine={false}
                height={40}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => formatearPeso(Number(v))}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-sm">
                      <p className="font-label text-[10px] font-bold text-on-surface mb-1">
                        {formatearMesCorto(String(label))}
                      </p>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-label text-[9px] text-on-surface-variant" style={{ color: colorFran }}>
                            {nombres.franco}
                          </span>
                          <span className="font-label text-[9px] tabular-nums font-bold" style={{ color: colorFran }}>
                            {formatearPeso(d.franco)} ({formatearPorcentaje(d.pctFranco)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="font-label text-[9px] text-on-surface-variant" style={{ color: colorFabi }}>
                            {nombres.fabiola}
                          </span>
                          <span className="font-label text-[9px] tabular-nums font-bold" style={{ color: colorFabi }}>
                            {formatearPeso(d.fabiola)} ({formatearPorcentaje(d.pctFabiola)})
                          </span>
                        </div>
                        <div className="border-t border-outline-variant/10 pt-0.5 flex items-center justify-between gap-4 text-xs">
                          <span className="font-label text-[9px] font-bold text-on-surface">Total</span>
                          <span className="font-label text-[9px] tabular-nums font-bold text-primary">
                            {formatearPeso(d.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="franco" stackId="a" radius={[0, 0, 0, 0]}>
                {datos.map((_, i) => (
                  <Cell key={`franco-${i}`} fill={colorFran} opacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="fabiola" stackId="a" radius={[6, 6, 0, 0]}>
                {datos.map((_, i) => (
                  <Cell key={`fabiola-${i}`} fill={colorFabi} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
