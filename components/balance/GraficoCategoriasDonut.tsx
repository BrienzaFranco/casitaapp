"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaBalance } from "@/types";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";

interface Props {
  registros: CategoriaBalance[];
}

export function GraficoCategoriasDonut({ registros }: Props) {
  const totalGeneral = registros.reduce((acc, r) => acc + r.total, 0);

  const datos = useMemo(
    () =>
      registros.map((r) => ({
        id: r.categoria.id,
        nombre: r.categoria.nombre,
        color: r.categoria.color || "#6b7280",
        total: r.total,
        pct: totalGeneral > 0 ? (r.total / totalGeneral) * 100 : 0,
      })),
    [registros, totalGeneral],
  );

  const [idxActivo, setIdxActivo] = useState(0);
  const activo = datos[idxActivo] ?? null;

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hay categorias con gasto para graficar.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Distribucion por categoria
        </h2>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="relative">
          <ResponsiveContainer width="99%" minHeight={192}>
            <PieChart>
              <Pie
                data={datos}
                dataKey="total"
                nameKey="nombre"
                innerRadius={52}
                outerRadius={78}
                onMouseEnter={(_, i) => setIdxActivo(i)}
                onClick={(_, i) => setIdxActivo(i)}
              >
                {datos.map((d, i) => (
                  <Cell
                    key={d.id}
                    fill={d.color}
                    fillOpacity={i === idxActivo ? 1 : 0.5}
                    stroke={i === idxActivo ? "var(--outline-variant)" : "transparent"}
                    strokeWidth={i === idxActivo ? 1.5 : 0}
                  />
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
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
              {activo?.nombre ?? "Sin datos"}
            </p>
            <p className="font-label text-lg font-bold tabular-nums text-primary mt-0.5">
              {activo ? formatearPeso(activo.total) : formatearPeso(0)}
            </p>
            <p className="font-label text-[10px] text-on-surface-variant">
              {activo ? formatearPorcentaje(activo.pct) : "0%"}
            </p>
          </div>
        </div>

        {/* Category list */}
        <div className="space-y-0 divide-y divide-outline-variant/10">
          {datos.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setIdxActivo(i)}
              className={`w-full flex items-center justify-between py-2 transition-colors duration-150 ${
                i === idxActivo ? "bg-surface-container-high" : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
              </div>
              <div className="text-right">
                <p className="font-label text-xs font-bold tabular-nums text-on-surface">
                  {formatearPeso(d.total)}
                </p>
                <p className="font-label text-[10px] text-on-surface-variant">
                  {formatearPorcentaje(d.pct)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
