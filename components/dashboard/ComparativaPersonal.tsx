"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import type { Compra, Categoria } from "@/types";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  comprasMes: Compra[];
  categorias: Categoria[];
  nombres: { franco: string; fabiola: string };
  colorFran: string;
  colorFabi: string;
}

export function ComparativaPersonal({ comprasMes, categorias, nombres, colorFran, colorFabi }: Props) {
  const datos = useMemo(() => {
    const porCategoria = new Map<string, { nombre: string; color: string; franco: number; fabiola: number }>();

    for (const compra of comprasMes) {
      for (const item of compra.items) {
        if (!item.categoria_id || !item.categoria) continue;
        const catId = item.categoria_id;
        const existing = porCategoria.get(catId) ?? {
          nombre: item.categoria.nombre,
          color: item.categoria.color,
          franco: 0,
          fabiola: 0,
        };
        existing.franco += item.pago_franco;
        existing.fabiola += item.pago_fabiola;
        porCategoria.set(catId, existing);
      }
    }

    return [...porCategoria.values()]
      .filter(c => c.franco > 0.01 || c.fabiola > 0.01)
      .sort((a, b) => (b.franco + b.fabiola) - (a.franco + a.fabiola));
  }, [comprasMes]);

  if (!datos.length) return null;

  return (
    <div className="w-full" style={{ minHeight: "200px" }}>
      <ResponsiveContainer width="99%" minHeight={200}>
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, left: 80, bottom: 4 }} barSize={14}>
          <XAxis
            type="number"
            tick={{ fontSize: 9, fill: "var(--on-surface-variant)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatearPeso(Number(v))}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={{ fontSize: 10, fill: "var(--on-surface)" }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-sm">
                  <p className="font-label text-[10px] font-bold text-on-surface mb-1">{d.nombre}</p>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-label text-[9px]" style={{ color: colorFran }}>{nombres.franco}</span>
                      <span className="font-label text-[9px] tabular-nums font-bold" style={{ color: colorFran }}>{formatearPeso(d.franco)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-label text-[9px]" style={{ color: colorFabi }}>{nombres.fabiola}</span>
                      <span className="font-label text-[9px] tabular-nums font-bold" style={{ color: colorFabi }}>{formatearPeso(d.fabiola)}</span>
                    </div>
                    <div className="border-t border-outline-variant/10 pt-0.5 flex items-center justify-between gap-4">
                      <span className="font-label text-[9px] font-bold text-on-surface">Total</span>
                      <span className="font-label text-[9px] tabular-nums font-bold text-primary">{formatearPeso(d.franco + d.fabiola)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="franco" stackId="a" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={`franco-${i}`} fill={colorFran} opacity={0.85} />
            ))}
          </Bar>
          <Bar dataKey="fabiola" stackId="a" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={`fabiola-${i}`} fill={colorFabi} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
