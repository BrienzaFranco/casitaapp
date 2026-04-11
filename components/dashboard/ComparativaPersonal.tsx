"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

export function ComparativaPersonal({ comprasMes, categorias, nombres, colorFran, colorFabi }: Props) {
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

  if (!datos.length) {
    return null;
  }

  const chartData = datos.map(d => ({
    categoria: d.categoria.nombre,
    franco: Math.round(d.franco * 100) / 100,
    fabiola: Math.round(d.fabiola * 100) / 100,
    color: d.categoria.color,
  }));

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
          {nombres.franco} vs {nombres.fabiola} — a quién le corresponde por categoría
        </p>
      </div>

      <div className="p-4">
        <div className="w-full" style={{ minHeight: "200px" }}>
          <ResponsiveContainer width="99%" minHeight={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 4, left: 80, bottom: 4 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatearPeso(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="categoria"
                tick={{ fontSize: 10, fill: "var(--on-surface)" }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => {
                  const label = name === "franco" ? nombres.franco : nombres.fabiola;
                  return [formatearPeso(Number(value)), label];
                }}
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "var(--outline-variant)",
                  backgroundColor: "var(--surface-container-lowest)",
                }}
              />
              <Bar dataKey="franco" name={nombres.franco} radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={`franco-${i}`} fill={colorFran} opacity={0.85} />
                ))}
              </Bar>
              <Bar dataKey="fabiola" name={nombres.fabiola} radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={`fabiola-${i}`} fill={colorFabi} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
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
