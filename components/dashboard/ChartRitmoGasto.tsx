"use client";

import { Line } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { registerCharts } from "@/lib/chart";

interface Props {
  comprasMesActual: Compra[];
  comprasMesAnterior: Compra[];
  mesActual: string;
  mesAnterior: string;
}

export function ChartRitmoGasto({ comprasMesActual, comprasMesAnterior, mesActual, mesAnterior }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => { registerCharts(); setReady(true); }, []);
  if (!ready) return null;
  const datos = useMemo(() => {
    const porDiaActual = new Map<number, number>();
    for (const compra of comprasMesActual) {
      const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
      porDiaActual.set(dia, (porDiaActual.get(dia) ?? 0) + compra.items.reduce((a, i) => a + i.monto_resuelto, 0));
    }

    const porDiaAnterior = new Map<number, number>();
    for (const compra of comprasMesAnterior) {
      const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
      porDiaAnterior.set(dia, (porDiaAnterior.get(dia) ?? 0) + compra.items.reduce((a, i) => a + i.monto_resuelto, 0));
    }

    let runningActual = 0;
    let runningAnterior = 0;
    return Array.from({ length: 31 }, (_, i) => {
      const dia = i + 1;
      runningActual += porDiaActual.get(dia) ?? 0;
      runningAnterior += porDiaAnterior.get(dia) ?? 0;
      return {
        dia,
        acumuladoActual: Number(runningActual.toFixed(2)),
        acumuladoAnterior: Number(runningAnterior.toFixed(2)),
      };
    });
  }, [comprasMesActual, comprasMesAnterior]);

  const hoy = new Date();
  const diaActual = hoy.getDate();
  const datosFiltrados = datos.filter(d => d.dia <= diaActual);
  const tieneDatosActual = comprasMesActual.length > 0;
  const tieneDatosAnterior = comprasMesAnterior.length > 0;

  const totalActual = datos[datos.length - 1]?.acumuladoActual ?? 0;
  const totalAnterior = datos[datos.length - 1]?.acumuladoAnterior ?? 0;
  const diff = totalActual - totalAnterior;
  const pctDiff = totalAnterior > 0 ? ((diff / totalAnterior) * 100).toFixed(0) : "—";

  if (!tieneDatosActual && !tieneDatosAnterior) return null;

  const chartData = datosFiltrados.length > 0 ? datosFiltrados : datos;

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
          <Line
            data={{
              labels: chartData.map(d => `Día ${d.dia}`),
              datasets: [
                ...(tieneDatosActual ? [{
                  label: mesActual,
                  data: chartData.map(d => d.acumuladoActual),
                  borderColor: "var(--primary)",
                  backgroundColor: "rgba(59,130,246,0.1)",
                  fill: true,
                  tension: 0.3,
                  borderWidth: 2.5,
                  pointRadius: 0,
                  pointHitRadius: 6,
                }] : []),
                ...(tieneDatosAnterior ? [{
                  label: mesAnterior,
                  data: chartData.map(d => d.acumuladoAnterior),
                  borderColor: "var(--on-surface-variant)",
                  backgroundColor: "rgba(107,114,128,0.05)",
                  fill: true,
                  tension: 0.3,
                  borderWidth: 1.5,
                  borderDash: [5, 3],
                  pointRadius: 0,
                  pointHitRadius: 6,
                }] : []),
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { intersect: false, mode: "index" as const },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => items[0]?.label ?? "",
                    label: (ctx) => {
                      const d = chartData[ctx.dataIndex];
                      const diff = d.acumuladoActual - d.acumuladoAnterior;
                      const p = d.acumuladoAnterior > 0 ? ((diff / d.acumuladoAnterior) * 100).toFixed(0) : "—";
                      return [
                        ` ${ctx.dataset.label}: ${formatearPeso(ctx.parsed.y as number)}`,
                        diff !== 0 ? ` Dif: ${diff > 0 ? "+" : ""}${formatearPeso(Math.abs(diff))} (${diff > 0 ? "+" : ""}${p}%)` : null,
                      ].filter(Boolean) as string[];
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: {
                    font: { size: 9 },
                    color: "var(--on-surface-variant)",
                    maxTicksLimit: 10,
                  },
                },
                y: {
                  grid: { color: "rgba(107,114,128,0.08)" },
                  border: { display: false },
                  ticks: {
                    font: { size: 9 },
                    color: "var(--on-surface-variant)",
                    callback: (v) => formatearPeso(Number(v)),
                  },
                },
              },
            }}
          />
        </div>

        <div className="flex items-center gap-4 mt-2 px-1">
          {tieneDatosActual && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: "var(--primary)" }} />
              <span className="font-label text-[9px] text-on-surface-variant">{mesActual}</span>
            </div>
          )}
          {tieneDatosAnterior && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ backgroundColor: "var(--on-surface-variant)", opacity: 0.5 }} />
              <span className="font-label text-[9px] text-on-surface-variant">{mesAnterior}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
