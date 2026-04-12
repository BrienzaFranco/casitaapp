"use client";

import { Doughnut } from "react-chartjs-2";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { registerCharts } from "@/lib/chart";

interface Props {
  comprasMes: Compra[];
  nombres: { franco: string; fabiola: string };
}

export function ChartDesgloseReparto({ comprasMes, nombres }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => { registerCharts(); setReady(true); }, []);
  if (!ready) return null;

  const datos = useMemo(() => {
    let compartido = 0;
    let soloFranco = 0;
    let soloFabiola = 0;
    let personalizado = 0;

    for (const compra of comprasMes) {
      for (const item of compra.items) {
        switch (item.tipo_reparto) {
          case "50/50": compartido += item.monto_resuelto; break;
          case "solo_franco": soloFranco += item.monto_resuelto; break;
          case "solo_fabiola": soloFabiola += item.monto_resuelto; break;
          case "personalizado": personalizado += item.monto_resuelto; break;
        }
      }
    }

    return [
      { id: "compartido", nombre: "Compartido (50/50)", total: compartido, color: "#6366f1" },
      { id: "solo_franco", nombre: `Solo ${nombres.franco}`, total: soloFranco, color: "#3b82f6" },
      { id: "solo_fabiola", nombre: `Solo ${nombres.fabiola}`, total: soloFabiola, color: "#10b981" },
      { id: "personalizado", nombre: "Personalizado", total: personalizado, color: "#f59e0b" },
    ].filter(d => d.total > 0.01);
  }, [comprasMes, nombres]);

  if (!datos.length) return null;

  const totalGeneral = datos.reduce((a, d) => a + d.total, 0);

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Tipo de reparto
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Gasto compartido vs individual
        </p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative flex items-center justify-center">
          <Doughnut
            data={{
              labels: datos.map(d => d.nombre),
              datasets: [{
                data: datos.map(d => d.total),
                backgroundColor: datos.map(d => d.color),
                borderWidth: 0,
              }],
            }}
            options={{
              responsive: true,
              cutout: "65%",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const pct = totalGeneral > 0 ? ((ctx.parsed as number / totalGeneral) * 100).toFixed(0) : "0";
                      return ` ${formatearPeso(ctx.parsed as number)} (${pct}%)`;
                    },
                  },
                },
              },
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Total</p>
            <p className="font-label text-base font-bold tabular-nums text-primary mt-0.5">
              {formatearPeso(totalGeneral)}
            </p>
          </div>
        </div>

        <div className="space-y-0 divide-y divide-outline-variant/10">
          {datos.map((d) => {
            const pct = totalGeneral > 0 ? ((d.total / totalGeneral) * 100).toFixed(0) : "0";
            return (
              <div key={d.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
                </div>
                <div className="text-right">
                  <p className="font-label text-xs font-bold tabular-nums text-on-surface">
                    {formatearPeso(d.total)}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">{pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
