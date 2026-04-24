"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Compra } from "@/types";

interface Props {
  compras: Compra[];
  color?: string;
  diasEnMes: number;
}

export function SparklineMes({ compras, color = "#5B9BD5", diasEnMes }: Props) {
  const datos = useMemo(() => {
    const mapa: Record<number, number> = {};
    for (let d = 1; d <= diasEnMes; d++) mapa[d] = 0;
    for (const compra of compras) {
      const dia = parseInt(compra.fecha.slice(8, 10), 10);
      for (const item of compra.items) {
        mapa[dia] = (mapa[dia] || 0) + item.monto_resuelto;
      }
    }
    return Array.from({ length: diasEnMes }, (_, i) => ({
      dia: i + 1,
      total: mapa[i + 1] || 0,
    }));
  }, [compras, diasEnMes]);

  return (
    <div className="w-full h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="total" stroke={color} strokeWidth={1.5} fill="url(#sparklineGrad)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
