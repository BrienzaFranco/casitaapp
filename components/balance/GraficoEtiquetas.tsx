"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EtiquetaBalance } from "@/types";
import { Badge } from "@/components/ui/Badge";
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
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Gastos por etiqueta</h2>
        <p className="text-sm text-gray-500">Vista comparativa de montos y frecuencia.</p>
      </div>

      {datos.length ? (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(valor) => formatearPeso(Number(valor))}
                />
                <Tooltip
                  formatter={(valor) => formatearPeso(Number(valor ?? 0))}
                  contentStyle={{ borderRadius: 14, borderColor: "#e5e7eb" }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {datos.map((dato) => (
                    <Cell key={dato.id} fill={dato.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            {datos.map((dato) => (
              <div key={dato.id} className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-3 py-2">
                <div className="space-y-1">
                  <Badge color={dato.color}>{dato.nombre}</Badge>
                  <p className="text-xs text-gray-500">{dato.cantidad_items} items</p>
                </div>
                <p className="font-mono text-sm font-semibold text-gray-950">{formatearPeso(dato.total)}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No hubo etiquetas usadas este mes.</p>
      )}
    </section>
  );
}
