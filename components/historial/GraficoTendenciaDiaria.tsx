"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    () => registros.map((r) => ({ ...r, etiqueta: etiquetaFechaCorta(r.fecha) })),
    [registros],
  );

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4">
        <p className="font-label text-xs text-on-surface-variant">No hay datos suficientes para mostrar tendencia.</p>
      </section>
    );
  }

  return (
    <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">Tendencia diaria</h2>
      </div>

      <div className="p-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={datos} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
              <defs>
                <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v) => formatearPeso(Number(v))}
              />
              <Tooltip
                formatter={(v) => formatearPeso(Number(v ?? 0))}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.fecha ? etiquetaFechaCorta(String(payload[0].payload.fecha)) : ""
                }
                contentStyle={{
                  borderRadius: "0.5rem",
                  borderColor: "var(--outline-variant)",
                  backgroundColor: "var(--surface-container-lowest)",
                }}
              />
              <Area type="monotone" dataKey="total" stroke="var(--secondary)" strokeWidth={2} fill="url(#colorTendencia)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
