"use client";

import { useMemo, useState, useCallback } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatearPeso } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import type { Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";
import { montoFiltrado } from "./FiltroGlobal";

interface DiaDato {
  dia: number;
  actual: number;
  anterior: number;
}

interface Props {
  comprasMes: Compra[];
  comprasMesAnterior: Compra[];
  filtro: FiltroActivo;
  promedioDiario: number;
  onDiaClick?: (dia: number) => void;
  colorActual?: string;
  colorAnterior?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null;

  const actual = payload.find((p) => p.name === "actual")?.value ?? 0;
  const anterior = payload.find((p) => p.name === "anterior")?.value ?? 0;
  const diff = actual - anterior;

  return (
    <div className="bg-surface-container-high border border-outline-variant/20 rounded-[10px] px-3 py-2 shadow-lg text-[11px]">
      <p className="font-medium text-on-surface mb-1">Día {label}</p>
      <div className="space-y-0.5">
        <p className="text-on-surface-variant">
          Este mes: <strong className="text-on-surface">{formatearPeso(actual)}</strong>
        </p>
        {anterior > 0 && (
          <p className="text-on-surface-variant">
            Mes anterior: <strong className="text-on-surface">{formatearPeso(anterior)}</strong>
          </p>
        )}
        {anterior > 0 && (
          <p className={diff > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>
            {diff > 0 ? "↑" : "↓"} {formatearPeso(Math.abs(diff))}
          </p>
        )}
      </div>
    </div>
  );
}

export function GraficoDiarioComparativo({
  comprasMes,
  comprasMesAnterior,
  filtro,
  promedioDiario,
  onDiaClick,
  colorActual = "#5B9BD5",
  colorAnterior = "#B5B5B5",
}: Props) {
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  const datos: DiaDato[] = useMemo(() => {
    // Build daily spending maps
    const porDiaActual = new Map<number, number>();
    const soloFranco = filtro.personas.length === 1 && filtro.personas[0] === "franco";
    const soloFabiola = filtro.personas.length === 1 && filtro.personas[0] === "fabiola";
    for (const compra of comprasMes) {
      const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
      if (soloFranco) {
        const totalDia = compra.items.reduce(
          (acc, item) => acc + item.pago_franco, 0,
        );
        porDiaActual.set(dia, (porDiaActual.get(dia) ?? 0) + totalDia);
      } else if (soloFabiola) {
        const totalDia = compra.items.reduce(
          (acc, item) => acc + item.pago_fabiola, 0,
        );
        porDiaActual.set(dia, (porDiaActual.get(dia) ?? 0) + totalDia);
      } else {
        const totalDia = compra.items.reduce(
          (acc, item) => acc + item.monto_resuelto, 0,
        );
        porDiaActual.set(dia, (porDiaActual.get(dia) ?? 0) + totalDia);
      }
    }

    const porDiaAnterior = new Map<number, number>();
    for (const compra of comprasMesAnterior) {
      const dia = new Date(`${compra.fecha}T00:00:00`).getDate();
      const totalDia = compra.items.reduce(
        (acc, item) => acc + item.monto_resuelto, 0,
      );
      porDiaAnterior.set(dia, (porDiaAnterior.get(dia) ?? 0) + totalDia);
    }

    const maxDia = Math.max(
      porDiaActual.size > 0 ? Math.max(...porDiaActual.keys()) : 1,
      porDiaAnterior.size > 0 ? Math.max(...porDiaAnterior.keys()) : 1,
      1,
    );

    const resultado: DiaDato[] = [];
    for (let d = 1; d <= maxDia; d++) {
      resultado.push({
        dia: d,
        actual: porDiaActual.get(d) ?? 0,
        anterior: porDiaAnterior.get(d) ?? 0,
      });
    }

    return resultado;
  }, [comprasMes, comprasMesAnterior, filtro.personas]);

  const maxValor = Math.max(...datos.map((d) => Math.max(d.actual, d.anterior)), 1);

  const handleBarClick = useCallback(
    (data: unknown) => {
      if (data && typeof data === "object") {
        const rec = data as Record<string, unknown>;
        if (rec.activePayload && Array.isArray(rec.activePayload) && rec.activePayload.length > 0) {
          const first = rec.activePayload[0] as Record<string, unknown>;
          if (first.payload && typeof first.payload === "object" && "dia" in first.payload) {
            const dia = (first.payload as Record<string, number>).dia;
            setDiaSeleccionado(dia);
            if (onDiaClick) onDiaClick(dia);
          }
        }
      }
    },
    [onDiaClick],
  );

  if (datos.length === 0) return null;

  return (
    <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-on-surface-variant/50">Gasto diario comparativo</p>
        <div className="flex gap-3 text-[10px] text-on-surface-variant/60">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colorActual }} />
            Este mes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-[2px] border-t border-dashed" style={{ borderColor: colorAnterior }} />
            Mes anterior
          </span>
        </div>
      </div>

      <div className="h-[160px] w-full -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} onClick={handleBarClick}>
            <CartesianGrid strokeDasharray="2 3" stroke="var(--color-border-tertiary, rgba(0,0,0,0.06))" vertical={false} />
            <XAxis
              dataKey="dia"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" }}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              domain={[0, maxValor * 1.15]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-background-secondary, rgba(0,0,0,0.03))" }} />
            <ReferenceLine
              y={promedioDiario}
              stroke="var(--color-text-tertiary, rgba(0,0,0,0.2))"
              strokeDasharray="3 3"
              label={{
                value: `prom ${formatearPeso(Math.round(promedioDiario))}`,
                position: "right",
                fontSize: 9,
                fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))",
              }}
            />
            <Bar
              dataKey="actual"
              fill={colorActual}
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
              animationDuration={400}
            />
            <Line
              type="monotone"
              dataKey="anterior"
              stroke={colorAnterior}
              strokeDasharray="4 2"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {diaSeleccionado && (
        <p className="text-[10px] text-on-surface-variant/50 mt-1 text-center">
          Día {diaSeleccionado} seleccionado ·{" "}
          <button
            type="button"
            className="text-on-surface-variant/70 underline"
            onClick={() => setDiaSeleccionado(null)}
          >
            ver todos
          </button>
        </p>
      )}
    </div>
  );
}
