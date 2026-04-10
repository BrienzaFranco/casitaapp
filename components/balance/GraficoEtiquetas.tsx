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
      registros.map((registro) => ({
        id: registro.etiqueta.id,
        nombre: registro.etiqueta.nombre,
        color: registro.etiqueta.color || "#6b7280",
        total: registro.total,
        cantidad_items: registro.cantidad_items,
      })),
    [registros],
  );

  return (
    <section className="rounded-xl bg-surface-container-lowest p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 space-y-1">
        <h2 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
          Gastos por etiqueta
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Vista comparativa de montos y frecuencia.
        </p>
      </div>

      {datos.length ? (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--on-surface-variant)" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(valor) => formatearPeso(Number(valor))}
                />
                <Tooltip
                  formatter={(valor) => formatearPeso(Number(valor ?? 0))}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    borderColor: "var(--outline-variant)",
                    backgroundColor: "var(--surface-container-lowest)",
                    color: "var(--on-surface)",
                  }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {datos.map((dato) => (
                    <Cell key={dato.id} fill={dato.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-1.5">
            {datos.map((dato) => (
              <div
                key={dato.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low px-3 py-2.5 transition-colors duration-150 hover:bg-surface-container"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: dato.color }}
                    />
                    <span className="font-label text-sm font-medium text-on-surface">
                      {dato.nombre}
                    </span>
                  </div>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {dato.cantidad_items} items
                  </p>
                </div>
                <p className="font-label text-sm font-bold tabular-nums text-on-surface">
                  {formatearPeso(dato.total)}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="font-body text-sm text-on-surface-variant">
          No hubo etiquetas usadas este mes.
        </p>
      )}
    </section>
  );
}
