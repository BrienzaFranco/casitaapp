"use client";

import { Bar } from "react-chartjs-2";
import { useMemo } from "react";
import { Users } from "lucide-react";
import type { Compra, Categoria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  comprasMes: Compra[];
  categorias: Categoria[];
  nombres: { franco: string; fabiola: string };
  colorFran: string;
  colorFabi: string;
}

export function ChartComparativaPersonal({ comprasMes, categorias, nombres, colorFran, colorFabi }: Props) {
  const datos = useMemo(() => {
    const porCategoria = new Map<string, { categoria: Categoria; franco: number; fabiola: number }>();

    for (const compra of comprasMes) {
      for (const item of compra.items) {
        if (!item.categoria_id || !item.categoria) continue;
        const catId = item.categoria_id;
        const existing = porCategoria.get(catId) ?? {
          categoria: item.categoria,
          franco: 0,
          fabiola: 0,
        };
        existing.franco += item.pago_franco;
        existing.fabiola += item.pago_fabiola;
        porCategoria.set(catId, existing);
      }
    }

    return [...porCategoria.values()]
      .filter(c => c.franco > 0.01 || c.fabiola > 0.01)
      .sort((a, b) => (b.franco + b.fabiola) - (a.franco + a.fabiola));
  }, [comprasMes]);

  if (!datos.length) return null;

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-on-surface-variant" />
          <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
            Comparativa por categoría
          </h2>
        </div>
        <p className="font-label text-[10px] text-on-surface-variant">
          {nombres.franco} vs {nombres.fabiola} — a quién le corresponde
        </p>
      </div>

      <div className="p-4">
        <div className="w-full" style={{ minHeight: "200px" }}>
          <Bar
            data={{
              labels: datos.map(d => d.categoria.nombre),
              datasets: [
                {
                  label: nombres.franco,
                  data: datos.map(d => Math.round(d.franco * 100) / 100),
                  backgroundColor: colorFran,
                  borderRadius: [0, 4, 4, 0],
                  borderSkipped: false,
                },
                {
                  label: nombres.fabiola,
                  data: datos.map(d => Math.round(d.fabiola * 100) / 100),
                  backgroundColor: colorFabi,
                  borderRadius: [0, 4, 4, 0],
                  borderSkipped: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "y",
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const label = ctx.datasetIndex === 0 ? nombres.franco : nombres.fabiola;
                      return ` ${label}: ${formatearPeso(ctx.parsed.x as number)}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { color: "rgba(107,114,128,0.08)" },
                  border: { display: false },
                  ticks: {
                    font: { size: 9 },
                    color: "var(--on-surface-variant)",
                    callback: (v) => formatearPeso(Number(v)),
                  },
                },
                y: {
                  grid: { display: false },
                  border: { display: false },
                  ticks: { font: { size: 10 }, color: "var(--on-surface)" },
                },
              },
            }}
          />
        </div>

        <div className="flex items-center gap-4 mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorFran }} />
            <span className="font-label text-[9px] text-on-surface-variant">{nombres.franco}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colorFabi }} />
            <span className="font-label text-[9px] text-on-surface-variant">{nombres.fabiola}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
