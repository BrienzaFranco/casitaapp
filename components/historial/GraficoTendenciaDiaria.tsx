"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PuntoTendenciaDiaria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  registros: PuntoTendenciaDiaria[];
}

function etiquetaFechaCorta(fechaIso: string) {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function GraficoTendenciaDiaria({ registros }: Props) {
  const datos = useMemo(
    () =>
      registros.map((registro) => ({
        ...registro,
        etiqueta: etiquetaFechaCorta(registro.fecha),
      })),
    [registros],
  );

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Tendencia diaria</h2>
        <p className="text-sm text-gray-500">Evolucion del gasto dia por dia para los filtros actuales.</p>
      </div>

      {datos.length ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(valor) => formatearPeso(Number(valor))}
              />
              <Tooltip
                formatter={(valor) => formatearPeso(Number(valor ?? 0))}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.fecha ? etiquetaFechaCorta(String(payload[0].payload.fecha)) : ""
                }
                contentStyle={{ borderRadius: 14, borderColor: "#e5e7eb" }}
              />
              <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} fill="url(#colorTendencia)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No hay datos suficientes para mostrar tendencia.</p>
      )}
    </section>
  );
}
