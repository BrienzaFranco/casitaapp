"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from "recharts";
import type { Compra } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  compras: Compra[];
  diasEnMes: number;
  color?: string;
  onDiaClick?: (dia: number) => void;
  diaSeleccionado?: number | null;
}

export function GraficoDiarioBarras({ compras, diasEnMes, color = "#a83900", onDiaClick, diaSeleccionado }: Props) {
  const datos = useMemo(() => {
    const mapa: Record<number, { total: number; cantidad: number }> = {};
    for (let d = 1; d <= diasEnMes; d++) mapa[d] = { total: 0, cantidad: 0 };
    for (const compra of compras) {
      const dia = parseInt(compra.fecha.slice(8, 10), 10);
      if (dia >= 1 && dia <= diasEnMes) {
        for (const item of compra.items) {
          mapa[dia].total += item.monto_resuelto;
          mapa[dia].cantidad += 1;
        }
      }
    }
    const totalGeneral = Object.values(mapa).reduce((s, d) => s + d.total, 0);
    const promedioDiario = totalGeneral / diasEnMes;
    return {
      puntos: Array.from({ length: diasEnMes }, (_, i) => ({
        dia: i + 1,
        label: String(i + 1),
        total: mapa[i + 1]?.total || 0,
        cantidad: mapa[i + 1]?.cantidad || 0,
      })),
      promedio: promedioDiario,
    };
  }, [compras, diasEnMes]);

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos.puntos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(diasEnMes / 7) - 1)} />
          <YAxis tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v === 0 ? "" : String(v)} />
          <Tooltip
            cursor={{ fill: "var(--surface-container-high)", opacity: 0.5 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { dia: number; total: number; cantidad: number };
              return (
                <div className="bg-surface-container-high border border-outline-variant/15 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                  <p className="font-semibold text-on-surface">Dia {d.dia}</p>
                  <p className="tabular-nums text-on-surface-variant">{formatearPeso(d.total)}</p>
                  {d.cantidad > 0 && (
                    <p className="text-[10px] text-on-surface-variant/70">{d.cantidad} item{d.cantidad !== 1 ? "s" : ""}</p>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine y={datos.promedio} stroke="var(--on-surface-variant)" strokeOpacity={0.3} strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="total" maxBarSize={Math.max(4, Math.min(24, 400 / diasEnMes))} cursor="pointer" onClick={(data) => onDiaClick?.((data as unknown as { dia: number }).dia)}>
            {datos.puntos.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.dia === diaSeleccionado ? color : color + "CC"}
                radius={[3, 3, 0, 0] as unknown as string | number | undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
