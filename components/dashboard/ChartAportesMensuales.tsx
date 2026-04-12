"use client";

import { Bar } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import type { BalanceMensualFila } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { registerCharts } from "@/lib/chart";

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

export function ChartAportesMensuales({ historico, nombres, colorFran, colorFabi }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => { registerCharts(); setReady(true); }, []);
  if (!ready) return null;

  const datos = useMemo(() => {
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

  if (!datos.length) return null;

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
          <Bar
            data={{
              labels: datos.map(d => formatearMesCorto(d.mes)),
              datasets: [
                {
                  label: nombres.franco,
                  data: datos.map(d => d.franco),
                  backgroundColor: colorFran,
                  borderRadius: 0,
                  borderSkipped: false,
                },
                {
                  label: nombres.fabiola,
                  data: datos.map(d => d.fabiola),
                  backgroundColor: colorFabi,
                  borderRadius: [6, 6, 0, 0],
                  borderSkipped: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "x",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => items[0]?.label ?? "",
                    label: (ctx) => {
                      const d = datos[ctx.dataIndex];
                      if (ctx.datasetIndex === 0) {
                        return ` ${nombres.franco}: ${formatearPeso(ctx.parsed.y as number)} (${formatearPorcentaje(d.pctFranco)})`;
                      }
                      return ` ${nombres.fabiola}: ${formatearPeso(ctx.parsed.y as number)} (${formatearPorcentaje(d.pctFabiola)})`;
                    },
                    afterBody: (items) => {
                      const d = datos[items[0]?.dataIndex ?? 0];
                      if (d) return [` Total: ${formatearPeso(d.total)}`];
                      return [];
                    },
                  },
                },
              },
              scales: {
                x: {
                  stacked: true,
                  grid: { display: false },
                  border: { display: false },
                  ticks: { font: { size: 9 }, color: "var(--on-surface-variant)" },
                },
                y: {
                  stacked: true,
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
      </div>
    </section>
  );
}
