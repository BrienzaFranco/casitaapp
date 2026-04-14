"use client";

import { useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatearPeso, formatearPorcentaje, formatearFecha } from "@/lib/formatear";
import type { Categoria, Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";
import { montoFiltrado, obtenerItemsFiltrados } from "./FiltroGlobal";

type TabId = "gastos" | "tendencia" | "subcategorias";

interface Props {
  categoria: Categoria;
  comprasMes: Compra[];
  comprasMesAnterior: Compra[];
  comprasHistorico: Compra[]; // all purchases
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
  const [tabActivo, setTabActivo] = useState<TabId>("gastos");
  const [orden, setOrden] = useState<"fecha" | "monto">("fecha");

  // Items in this category for current period
  const itemsMes = useMemo(() => {
    const catFiltro: FiltroActivo = { ...filtro, categorias: [categoria.id] };
    return obtenerItemsFiltrados(comprasMes, catFiltro);
  }, [comprasMes, categoria.id, filtro]);

  const totalMes = useMemo(
    () => montoFiltrado(comprasMes, { ...filtro, categorias: [categoria.id] }),
    [comprasMes, categoria.id, filtro],
  );

  const totalAnterior = useMemo(
    () => montoFiltrado(comprasMesAnterior, { ...filtro, categorias: [categoria.id] }),
    [comprasMesAnterior, categoria.id, filtro],
  );

  const variacion = totalAnterior > 0 ? ((totalMes - totalAnterior) / totalAnterior) * 100 : 0;
  const limite = categoria.limite_mensual ?? 0;
  const restante = limite - totalMes;
  const pct = limite > 0 ? (totalMes / limite) * 100 : 0;

  // Bar color
  let barColor = "#1D9E75";
  if (pct > 100) barColor = "#E24B4A";
  else if (pct >= 80) barColor = "#EF9F27";

  // 6-month trend derived from ALL purchases
  const historicoMensual = useMemo(() => {
    const meses: { mes: string; mesKey: string; total: number }[] = [];
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const ahora = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const mesLabel = `${mesesNombres[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

      let total = 0;
      for (const compra of comprasHistorico) {
        if (!compra.fecha.startsWith(mesKey)) continue;
        for (const item of compra.items) {
          if (item.categoria_id !== categoria.id) continue;
          total += item.monto_resuelto;
        }
      }

      meses.push({ mes: mesLabel, mesKey, total });
    }

    return meses;
  }, [comprasHistorico, categoria.id]);

  const avgHistorico = historicoMensual.length > 0
    ? historicoMensual.reduce((a, m) => a + m.total, 0) / historicoMensual.length
    : 0;
  const diffVsPromedio = avgHistorico > 0 ? ((totalMes - avgHistorico) / avgHistorico) * 100 : 0;

  // Subcategories breakdown
  const subcategorias = useMemo(() => {
    const subs = new Map<string, { nombre: string; total: number; subcategoriaId?: string }>();
    for (const item of itemsMes) {
      if (!item.subcategoria_id) continue;
      const key = item.subcategoria_id;
      const monto = filtro.personas.length === 1 && filtro.personas[0] === "franco"
        ? item.pago_franco
        : filtro.personas.length === 1 && filtro.personas[0] === "fabiola"
          ? item.pago_fabiola
          : item.monto_resuelto;
      const existente = subs.get(key);
      if (existente) {
        existente.total += monto;
      } else {
        subs.set(key, { nombre: item.subcategoria?.nombre || "Sin subcategoría", total: monto, subcategoriaId: item.subcategoria_id });
      }
    }
    return [...subs.values()].sort((a, b) => b.total - a.total);
  }, [itemsMes, filtro.personas]);

  const maxSub = subcategorias.length > 0 ? Math.max(...subcategorias.map((s) => s.total), 1) : 1;

  // Sort items
  const itemsOrdenados = useMemo(() => {
    return [...itemsMes].sort((a, b) => {
      if (orden === "fecha") return b.compraFecha.localeCompare(a.compraFecha);
      const montoA = filtro.personas.length === 1 && filtro.personas[0] === "franco" ? a.pago_franco : filtro.personas.length === 1 && filtro.personas[0] === "fabiola" ? a.pago_fabiola : a.monto_resuelto;
      const montoB = filtro.personas.length === 1 && filtro.personas[0] === "franco" ? b.pago_franco : filtro.personas.length === 1 && filtro.personas[0] === "fabiola" ? b.pago_fabiola : b.monto_resuelto;
      return montoB - montoA;
    });
  }, [itemsMes, orden, filtro.personas]);

  function montoVisible(item: typeof itemsMes[number]): number {
    if (filtro.personas.length === 1 && filtro.personas[0] === "franco") return item.pago_franco;
    if (filtro.personas.length === 1 && filtro.personas[0] === "fabiola") return item.pago_fabiola;
    return item.monto_resuelto;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "gastos", label: "Gastos" },
    { id: "tendencia", label: "Tendencia" },
    { id: "subcategorias", label: "Subcategorías" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl transition-transform duration-250"
        style={{ transform: "translateY(0)", transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
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

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActivo(tab.id)}
              className={`flex-1 py-2 text-[11px] font-medium text-center transition-colors ${
                tabActivo === tab.id
                  ? "text-on-surface border-b-2 border-[#5B9BD5]"
                  : "text-on-surface-variant/50 hover:text-on-surface-variant/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* TAB 1: Gastos */}
          {tabActivo === "gastos" && (
            <div className="px-4 py-3">
              {/* Mini resumen */}
              <div className="space-y-2.5 mb-3 pb-3 border-b border-outline-variant/10">
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
                      <div className="h-full rounded-full transition-all duration-400" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-on-surface-variant/40">
                      <span>{formatearPorcentaje(Math.round(pct))} del límite</span>
                      <span className={restante < 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>
                        {restante < 0 ? `${formatearPeso(Math.abs(restante))} excedido` : `${formatearPeso(restante)} restante`}
                      </span>
                    </div>
                  </>
                )}

                {totalAnterior > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {variacion > 0 ? <TrendingUp className="h-3.5 w-3.5 text-[#A32D2D]" /> : <TrendingDown className="h-3.5 w-3.5 text-[#0F6E56]" />}
                    <span className={variacion > 0 ? "text-[#854F0B]" : "text-[#0F6E56]"}>
                      {variacion > 0 ? "↑" : "↓"} {formatearPorcentaje(Math.abs(Math.round(variacion)))} vs mes anterior
                    </span>
                  </div>
                )}
              </div>

              {/* Lista de gastos */}
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-on-surface-variant/50">Gastos individuales ({itemsOrdenados.length})</p>
                <button
                  type="button"
                  onClick={() => setOrden(orden === "fecha" ? "monto" : "fecha")}
                  className="flex items-center gap-1 text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant/70"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {orden === "fecha" ? "Fecha" : "Monto"}
                </button>
              </div>
              <div className="space-y-1">
                {itemsOrdenados.map((item) => (
                  <div key={item.id} className="flex items-start justify-between py-1.5 px-1 rounded-lg hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-headline text-xs font-medium text-on-surface truncate">{item.descripcion || "Sin detalle"}</p>
                      <p className="font-label text-[10px] text-on-surface-variant/60">{formatearFecha(item.compraFecha)} · {item.compraLugar || "Sin lugar"}</p>
                      {item.subcategoria && (
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/50">
                          {item.subcategoria.nombre}
                        </span>
                      )}
                    </div>
                    <span className="font-label text-xs font-semibold tabular-nums text-on-surface shrink-0 ml-2">
                      {formatearPeso(montoVisible(item))}
                    </span>
                  </div>
                ))}
                {itemsOrdenados.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant/40 py-3 text-center">Sin gastos</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Tendencia */}
          {tabActivo === "tendencia" && (
            <div className="px-4 py-3 space-y-3">
              {/* Resumen comparativo */}
              <div className="bg-surface-container-low rounded-[12px] px-3 py-2.5">
                <p className="text-[10px] text-on-surface-variant/50 mb-1">Comparativa 6 meses</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[18px] font-medium text-on-surface">{formatearPeso(totalMes)}</p>
                    <p className="text-[10px] text-on-surface-variant/40">Este mes</p>
                  </div>
                  {avgHistorico > 0 && (
                    <div className="text-right">
                      <p className="text-[13px] text-on-surface-variant">{formatearPeso(Math.round(avgHistorico))}</p>
                      <p className="text-[10px] text-on-surface-variant/40">Promedio 6 meses</p>
                    </div>
                  )}
                </div>
                {avgHistorico > 0 && (
                  <p className={`text-[11px] mt-1 ${diffVsPromedio > 0 ? "text-[#854F0B]" : "text-[#0F6E56]"}`}>
                    {diffVsPromedio > 0 ? "↑" : "↓"} {formatearPorcentaje(Math.abs(Math.round(diffVsPromedio)))} {diffVsPromedio > 0 ? "sobre" : "bajo"} tu promedio
                  </p>
                )}
              </div>

              {/* Chart */}
              <div className="h-[120px]">
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
                    {avgHistorico > 0 && (
                      <ReferenceLine
                        y={avgHistorico}
                        stroke="var(--color-text-tertiary, rgba(0,0,0,0.2))"
                        strokeDasharray="3 3"
                        label={{ value: "prom", position: "insideBottomLeft", fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" }}
                      />
                    )}
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
          )}

          {/* TAB 3: Subcategorías */}
          {tabActivo === "subcategorias" && (
            <div className="px-4 py-3">
              {subcategorias.length > 0 ? (
                <div className="space-y-2">
                  {subcategorias.map((sub) => {
                    const subPct = totalMes > 0 ? (sub.total / totalMes) * 100 : 0;
                    return (
                      <div key={sub.subcategoriaId} className="bg-surface-container-low rounded-[10px] px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-on-surface font-medium">{sub.nombre}</span>
                          <div className="text-right">
                            <span className="text-[12px] font-medium tabular-nums text-on-surface">{formatearPeso(sub.total)}</span>
                            <span className="text-[10px] text-on-surface-variant/40 ml-1">({formatearPorcentaje(Math.round(subPct))})</span>
                          </div>
                        </div>
                        <div className="h-[4px] bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${subPct}%`, backgroundColor: categoria.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-on-surface-variant/40 py-6 text-center">
                  No hay subcategorías para {categoria.nombre}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
