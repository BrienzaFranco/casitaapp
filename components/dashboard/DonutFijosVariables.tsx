"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import type { CategoriaBalance } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  categoriasMes: CategoriaBalance[];
  colorFijo?: string;
  colorVariable?: string;
}

export function DonutFijosVariables({ categoriasMes, colorFijo, colorVariable }: Props) {
  const datos = useMemo(() => {
    let totalFijos = 0;
    let totalVariables = 0;

    for (const cat of categoriasMes) {
      if (cat.es_fijo) {
        totalFijos += cat.total;
      } else {
        totalVariables += cat.total;
      }
    }

    const totalGeneral = totalFijos + totalVariables;
    if (totalGeneral < 0.01) return null;

    const segmentos = [
      {
        id: "fijos",
        nombre: "Fijos",
        total: totalFijos,
        color: colorFijo ?? "#64748b",
      },
      {
        id: "variables",
        nombre: "Variables",
        total: totalVariables,
        color: colorVariable ?? "var(--primary)",
      },
    ].filter(d => d.total > 0.01).map(d => ({
      ...d,
      pct: totalGeneral > 0 ? (d.total / totalGeneral) * 100 : 0,
    }));

    if (segmentos.length === 0) return null;

    return { segmentos, totalGeneral };
  }, [categoriasMes, colorFijo, colorVariable]);

  if (!datos) return null;

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Fijos vs Variables
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          Distribución del gasto mensual
        </p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative" style={{ minHeight: "160px" }}>
          <ResponsiveContainer width="99%" minHeight={160}>
            <PieChart>
              <Pie
                data={datos.segmentos}
                dataKey="total"
                nameKey="nombre"
                innerRadius={45}
                outerRadius={65}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {datos.segmentos.map((d, i) => (
                  <Cell key={d.id} fill={d.color} fillOpacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => formatearPeso(Number(v ?? 0))}
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "var(--outline-variant)",
                  backgroundColor: "var(--surface-container-lowest)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Total</p>
            <p className="font-label text-base font-bold tabular-nums text-primary mt-0.5">
              {formatearPeso(datos.totalGeneral)}
            </p>
          </div>
        </div>

        <div className="space-y-0 divide-y divide-outline-variant/10">
          {datos.segmentos.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
              </div>
              <div className="text-right">
                <p className="font-label text-xs font-bold tabular-nums text-on-surface">
                  {formatearPeso(d.total)}
                </p>
                <p className="font-label text-[9px] text-on-surface-variant">
                  {d.pct.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
