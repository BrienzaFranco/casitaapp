"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Compra, PuntoTendenciaDiaria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  registros: PuntoTendenciaDiaria[];
  compras?: Compra[];
  nombres?: { franco: string; fabiola: string };
}

function etiquetaFechaCorta(fechaIso: string) {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function GraficoTendenciaDiaria({ registros, compras, nombres }: Props) {
  // Calcular dominancia por dia: quien pago mas ese dia
  const dominanciaPorDia = useMemo(() => {
    if (!compras) return {} as Record<string, number>;
    const mapa: Record<string, number> = {};
    // 0 = Franco domina, 100 = Fabiola domina, 50 = parejo
    for (const compra of compras) {
      let francoPago = 0, fabiolaPago = 0;
      for (const item of compra.items) {
        if (compra.pagador_general === "franco") francoPago += item.monto_resuelto;
        else if (compra.pagador_general === "fabiola") fabiolaPago += item.monto_resuelto;
        else { francoPago += item.pago_franco; fabiolaPago += item.pago_fabiola; }
      }
      const total = francoPago + fabiolaPago;
      if (total > 0) {
        const pctFabiola = (fabiolaPago / total) * 100;
        mapa[compra.fecha] = (mapa[compra.fecha] || 0) + pctFabiola;
      }
    }
    return mapa;
  }, [compras]);

  const datos = useMemo(
    () => registros.map((r) => ({
      ...r,
      etiqueta: etiquetaFechaCorta(r.fecha),
      dominancia: dominanciaPorDia[r.fecha] ?? 50,
    })),
    [registros, dominanciaPorDia],
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
                <linearGradient id="gradFranco" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tertiary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--tertiary)" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gradFabiola" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.4} />
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
              {/* Area de fondo - Franco domina */}
              <Area type="monotone" dataKey="total" stroke="var(--tertiary)" strokeWidth={2} fill="url(#gradFranco)" opacity={0.3} />
              {/* Area de fondo - Fabiola domina */}
              <Area type="monotone" dataKey="total" stroke="var(--secondary)" strokeWidth={2} fill="url(#gradFabiola)" opacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de dominancia */}
        {nombres && (
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-tertiary" />
              <span className="font-label text-[9px] text-on-surface-variant">{nombres.franco} pago mas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-secondary" />
              <span className="font-label text-[9px] text-on-surface-variant">{nombres.fabiola} pago mas</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
