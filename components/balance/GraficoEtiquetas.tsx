"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EtiquetaBalance } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  registros: EtiquetaBalance[];
}

export function GraficoEtiquetas({ registros }: Props) {
  const datos = useMemo(
    () =>
      registros.map((r) => ({
        id: r.etiqueta.id,
        nombre: r.etiqueta.nombre,
        color: r.etiqueta.color || "#6b7280",
        total: r.total,
        cantidad_items: r.cantidad_items,
      })),
    [registros],
  );

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hubo etiquetas usadas este mes.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Gastos por etiqueta
        </h2>
      </div>

      <div className="p-4">
          <ResponsiveContainer width="99%" minHeight={192}>
            <BarChart data={datos} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
              <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => formatearPeso(Number(v))}
              />
              <Tooltip
                formatter={(v) => formatearPeso(Number(v ?? 0))}
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "var(--outline-variant)",
                  backgroundColor: "var(--surface-container-lowest)",
                }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {datos.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 space-y-0 divide-y divide-outline-variant/10">
          {datos.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
                <span className="font-label text-[10px] text-on-surface-variant">{d.cantidad_items} items</span>
              </div>
              <span className="font-label text-sm font-bold tabular-nums text-on-surface">
                {formatearPeso(d.total)}
              </span>
            </div>
          ))}
        </div>
    </section>
  );
}
