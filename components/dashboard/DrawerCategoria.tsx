"use client";

import { useMemo } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { formatearPeso, formatearPorcentaje, formatearFecha } from "@/lib/formatear";
import type { Categoria, Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";
import { montoFiltrado, obtenerItemsFiltrados } from "./FiltroGlobal";

interface Props {
  categoria: Categoria;
  comprasMes: Compra[];
  comprasMesAnterior: Compra[];
  comprasHistorico: Compra[]; // all purchases for historical trend
  filtro: FiltroActivo;
  onClose: () => void;
}

export function DrawerCategoria({
  categoria,
  comprasMes,
  comprasMesAnterior,
  comprasHistorico,
  filtro,
  onClose,
}: Props) {
  // Items in this category for current month
  const itemsMes = useMemo(() => {
    const catFiltro = { ...filtro, categoriaId: categoria.id };
    return obtenerItemsFiltrados(comprasMes, catFiltro);
  }, [comprasMes, categoria.id, filtro]);

  const totalMes = useMemo(
    () => montoFiltrado(comprasMes, { ...filtro, categoriaId: categoria.id }),
    [comprasMes, categoria.id, filtro],
  );

  // Total previous month for same category
  const totalAnterior = useMemo(
    () => montoFiltrado(comprasMesAnterior, { ...filtro, categoriaId: categoria.id }),
    [comprasMesAnterior, categoria.id, filtro],
  );

  const variacion = totalAnterior > 0 ? ((totalMes - totalAnterior) / totalAnterior) * 100 : 0;

  const limite = categoria.limite_mensual ?? 0;
  const restante = limite - totalMes;
  const pct = limite > 0 ? (totalMes / limite) * 100 : 0;

  // 6-month trend: derive from historical purchases by category
  const historicoMensual = useMemo(() => {
    const meses: { mes: string; total: number }[] = [];
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // Get last 6 months including current
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mesLabel = `${mesesNombres[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

      // Filter purchases for this month + this category
      let total = 0;
      for (const compra of comprasHistorico) {
        if (!compra.fecha.startsWith(mesKey)) continue;
        for (const item of compra.items) {
          if (item.categoria_id !== categoria.id) continue;
          total += item.monto_resuelto;
        }
      }

      meses.push({ mes: mesLabel, total });
    }

    return meses;
  }, [comprasHistorico, categoria.id]);

  const maxHistorico = Math.max(...historicoMensual.map((h) => h.total), 1);

  // Bar color for progress bar
  let barColor = "#1D9E75";
  if (pct > 100) barColor = "#E24B4A";
  else if (pct >= 80) barColor = "#EF9F27";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoria.color }} />
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Detalle categoría</p>
              <p className="font-headline text-sm font-semibold text-on-surface">{categoria.nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Mini resumen */}
          <div className="px-4 py-3 space-y-2.5 border-b border-outline-variant/10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-on-surface-variant/50">Total gastado</p>
                <p className="text-[24px] font-medium text-on-surface leading-tight">{formatearPeso(totalMes)}</p>
              </div>
              {limite > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-on-surface-variant/50">Límite</p>
                  <p className="text-[13px] text-on-surface-variant">{formatearPeso(limite)}</p>
                </div>
              )}
            </div>

            {limite > 0 && (
              <>
                <div className="h-[5px] bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant/40">
                  <span>{formatearPorcentaje(Math.round(pct))} del límite</span>
                  <span className={restante < 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>
                    {restante < 0 ? `${formatearPeso(Math.abs(restante))} excedido` : `${formatearPeso(restante)} restante`}
                  </span>
                </div>
              </>
            )}

            {/* Variación vs mes anterior */}
            {totalAnterior > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {variacion > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#A32D2D]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#0F6E56]" />
                )}
                <span className={variacion > 0 ? "text-[#854F0B]" : "text-[#0F6E56]"}>
                  {variacion > 0 ? "↑" : "↓"} {formatearPorcentaje(Math.abs(Math.round(variacion)))} vs mes anterior
                </span>
              </div>
            )}
          </div>

          {/* Lista de gastos individuales */}
          <div className="px-4 py-3 border-b border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant/50 mb-2">Gastos individuales ({itemsMes.length})</p>
            <div className="space-y-1">
              {itemsMes
                .sort((a, b) => b.compraFecha.localeCompare(a.compraFecha))
                .map((item) => (
                  <div key={item.id} className="flex items-start justify-between py-1.5 px-1 rounded-lg hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-xs font-medium text-on-surface truncate">
                        {item.descripcion || "Sin detalle"}
                      </p>
                      <p className="font-label text-[10px] text-on-surface-variant/60">
                        {formatearFecha(item.compraFecha)} · {item.compraLugar || "Sin lugar"}
                      </p>
                      {item.categoria && (
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/50">
                          {item.categoria.nombre}
                        </span>
                      )}
                    </div>
                    <span className="font-label text-xs font-semibold tabular-nums text-on-surface shrink-0 ml-2">
                      {formatearPeso(filtro.persona === "franco" ? item.pago_franco : filtro.persona === "fabiola" ? item.pago_fabiola : item.monto_resuelto)}
                    </span>
                  </div>
                ))}
              {itemsMes.length === 0 && (
                <p className="text-[11px] text-on-surface-variant/40 py-2 text-center">Sin gastos</p>
              )}
            </div>
          </div>

          {/* Mini gráfico de tendencia (6 meses) */}
          <div className="px-4 py-3">
            <p className="text-[10px] text-on-surface-variant/50 mb-2">Tendencia últimos 6 meses</p>
            <div className="h-[100px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicoMensual}>
                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <Bar
                    dataKey="total"
                    fill={categoria.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                    animationDuration={300}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
