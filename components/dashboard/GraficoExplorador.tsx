"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatearPeso } from "@/lib/formatear";
import type { Compra, BalanceMensualFila } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";
import { montoFiltrado, obtenerItemsFiltrados } from "./FiltroGlobal";

// ─── Types ──────────────────────────────────────────────────────────────────

export type EjeX = "dia" | "semana" | "mes" | "dia-semana" | "categoria";
export type EjeY = "monto" | "cantidad" | "ticket" | "franco" | "fabiola";
export type TipoGrafico = "barras" | "linea" | "area";
export type Desglose = "ninguno" | "persona" | "categorias-top5" | "etiqueta";

interface ConfigGrafico {
  ejeX: EjeX;
  ejeY: EjeY;
  tipo: TipoGrafico;
  desglose: Desglose;
}

const STORAGE_KEY = "casita-grafico-explorador";

function loadConfig(): ConfigGrafico {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* localStorage not available */ }
  return { ejeX: "dia", ejeY: "monto", tipo: "barras", desglose: "ninguno" };
}

function saveConfig(cfg: ConfigGrafico) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* localStorage not available */ }
}

// ─── Data builder ───────────────────────────────────────────────────────────

interface Props {
  comprasFiltradas: Compra[];
  comprasMesAnterior: Compra[];
  filtro: FiltroActivo;
  resumenHistorico: BalanceMensualFila[];
}

export function GraficoExplorador({ comprasFiltradas, comprasMesAnterior, filtro, resumenHistorico }: Props) {
  const [config, setConfig] = useState<ConfigGrafico>(loadConfig);

  useEffect(() => saveConfig(config), [config]);

  const updateConfig = (partial: Partial<ConfigGrafico>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      // When X = "categoria", force barras type
      if (next.ejeX === "categoria") next.tipo = "barras";
      return next;
    });
  };

  const datosGrafico = useMemo(() => {
    return construirDatosGrafico(comprasFiltradas, comprasMesAnterior, config.ejeX, config.ejeY, config.desglose, filtro, resumenHistorico);
  }, [comprasFiltradas, comprasMesAnterior, config.ejeX, config.ejeY, config.desglose, filtro, resumenHistorico]);

  const esHorizontal = config.ejeX === "categoria";

  // ── Chart renderer ──
  function renderChart() {
    const ChartComponent = config.tipo === "linea" ? LineChart : config.tipo === "area" ? AreaChart : BarChart;
    const SerieComponent = config.tipo === "linea" ? Line : config.tipo === "area" ? Area : Bar;

    // For desglose "ninguno"
    const dataKey = "valor";
    const color = "#5B9BD5";

    // For desglose "persona"
    const keysPersona = ["Franco", "Fabiola"];
    const coloresPersona = ["#534AB7", "#0F6E56"];

    // For desglose "categorias-top5"
    const top5 = datosGrafico.top5Categorias ?? [];
    const keysCategorias = top5.map((c) => c.nombre);
    const coloresCategorias = top5.map((c) => c.color);

    // For desglose "etiqueta"
    const etiquetas = datosGrafico.topEtiquetas ?? [];
    const keysEtiquetas = etiquetas.map((e) => e.nombre);
    const coloresEtiquetas = etiquetas.map((e) => e.color || "#6b7280");

    const commonProps = {
      data: datosGrafico.rows,
      margin: { top: 5, right: 5, left: 5, bottom: 5 },
    };

    const axisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 9, fill: "var(--color-text-tertiary, rgba(0,0,0,0.3))" },
    };

    return (
      <ResponsiveContainer width="100%" height={esHorizontal ? Math.max(datosGrafico.rows.length * 28 + 30, 120) : 160}>
        {esHorizontal ? (
          <BarChart layout="vertical" {...commonProps}>
            <CartesianGrid strokeDasharray="2 3" stroke="var(--color-border-tertiary, rgba(0,0,0,0.06))" horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
            <YAxis type="category" dataKey="label" {...axisProps} width={80} />
            <Tooltip content={<TooltipCustom />} />
            {config.desglose === "ninguno" && (
              <Bar dataKey={dataKey} fill={color} radius={[0, 3, 3, 0]} maxBarSize={20} />
            )}
            {config.desglose === "persona" && keysPersona.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={coloresPersona[i]} radius={[0, 3, 3, 0]} maxBarSize={20} />
            ))}
            {config.desglose === "categorias-top5" && keysCategorias.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={coloresCategorias[i]} radius={[0, 3, 3, 0]} maxBarSize={20} />
            ))}
            {config.desglose === "etiqueta" && keysEtiquetas.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={coloresEtiquetas[i]} radius={[0, 3, 3, 0]} maxBarSize={20} />
            ))}
          </BarChart>
        ) : (
          <ChartComponent {...commonProps}>
            <CartesianGrid strokeDasharray="2 3" stroke="var(--color-border-tertiary, rgba(0,0,0,0.06))" vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis {...axisProps} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
            <Tooltip content={<TooltipCustom />} />
            {config.desglose === "ninguno" && (
              <>
                {config.tipo === "barras" && <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={20} />}
                {config.tipo === "linea" && <Line dataKey={dataKey} stroke={color} strokeWidth={2} dot />}
                {config.tipo === "area" && <Area dataKey={dataKey} stroke={color} fill={`${color}40`} strokeWidth={2} />}
                {/* Previous period as dotted line */}
                {datosGrafico.hasAnterior && (
                  <Line dataKey="anterior" stroke="#B5B5B5" strokeDasharray="4 2" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                )}
              </>
            )}
            {config.desglose === "persona" && (
              config.tipo === "barras"
                ? keysPersona.map((key, i) => <Bar key={key} dataKey={key} stackId="a" fill={coloresPersona[i]} radius={[3, 3, 0, 0]} maxBarSize={20} />)
                : config.tipo === "linea"
                  ? keysPersona.map((key, i) => <Line key={key} dataKey={key} stroke={coloresPersona[i]} strokeWidth={2} dot />)
                  : keysPersona.map((key, i) => <Area key={key} dataKey={key} stackId="a" stroke={coloresPersona[i]} fill={`${coloresPersona[i]}40`} strokeWidth={2} />)
            )}
            {config.desglose === "categorias-top5" && (
              config.tipo === "barras"
                ? keysCategorias.map((key, i) => <Bar key={key} dataKey={key} stackId="a" fill={coloresCategorias[i]} radius={[3, 3, 0, 0]} maxBarSize={20} />)
                : config.tipo === "linea"
                  ? keysCategorias.map((key, i) => <Line key={key} dataKey={key} stroke={coloresCategorias[i]} strokeWidth={2} dot />)
                  : keysCategorias.map((key, i) => <Area key={key} dataKey={key} stackId="a" stroke={coloresCategorias[i]} fill={`${coloresCategorias[i]}40`} strokeWidth={2} />)
            )}
            {config.desglose === "etiqueta" && (
              config.tipo === "barras"
                ? keysEtiquetas.map((key, i) => <Bar key={key} dataKey={key} stackId="a" fill={coloresEtiquetas[i]} radius={[3, 3, 0, 0]} maxBarSize={20} />)
                : config.tipo === "linea"
                  ? keysEtiquetas.map((key, i) => <Line key={key} dataKey={key} stroke={coloresEtiquetas[i]} strokeWidth={2} dot />)
                  : keysEtiquetas.map((key, i) => <Area key={key} dataKey={key} stackId="a" stroke={coloresEtiquetas[i]} fill={`${coloresEtiquetas[i]}40`} strokeWidth={2} />)
            )}
          </ChartComponent>
        )}
      </ResponsiveContainer>
    );
  }

  // ── Selector UI ──
  function Selector({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-on-surface-variant/40">{label}</span>
        <div className="flex gap-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${value === opt.value ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant/50 hover:bg-surface-container-low"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-4 py-3">
      {/* Selectors */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <Selector
          label="Tipo"
          options={[{ value: "barras", label: "Barras" }, { value: "linea", label: "Línea" }, { value: "area", label: "Área" }]}
          value={config.tipo}
          onChange={(v) => updateConfig({ tipo: v as TipoGrafico })}
        />
        <Selector
          label="Eje X"
          options={[
            { value: "dia", label: "Día" },
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mes" },
            { value: "dia-semana", label: "Día sem." },
            { value: "categoria", label: "Categoría" },
          ]}
          value={config.ejeX}
          onChange={(v) => updateConfig({ ejeX: v as EjeX })}
        />
        <Selector
          label="Eje Y"
          options={[
            { value: "monto", label: "Monto" },
            { value: "cantidad", label: "Cantidad" },
            { value: "ticket", label: "Ticket prom." },
            { value: "franco", label: "Franco" },
            { value: "fabiola", label: "Fabiola" },
          ]}
          value={config.ejeY}
          onChange={(v) => updateConfig({ ejeY: v as EjeY })}
        />
        <Selector
          label="Desglose"
          options={[
            { value: "ninguno", label: "Sin desglose" },
            { value: "persona", label: "Persona" },
            { value: "categorias-top5", label: "Cat. top 5" },
            { value: "etiqueta", label: "Etiqueta" },
          ]}
          value={config.desglose}
          onChange={(v) => updateConfig({ desglose: v as Desglose })}
        />
      </div>

      {/* Chart */}
      {datosGrafico.rows.length > 0 ? renderChart() : (
        <p className="text-[11px] text-on-surface-variant/40 py-6 text-center">Sin datos para esta combinación</p>
      )}
    </div>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function TooltipCustom({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-high border border-outline-variant/20 rounded-[10px] px-3 py-2 shadow-lg text-[11px]">
      {payload.map((p, i) => (
        <p key={i} className="text-on-surface-variant">
          {p.name}: <strong className="text-on-surface">{typeof p.value === "number" && p.value % 1 === 0 ? p.value : formatearPeso(Math.round(p.value))}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Data builder function ──────────────────────────────────────────────────

interface DatosGrafico {
  rows: Record<string, string | number>[];
  hasAnterior: boolean;
  top5Categorias?: { nombre: string; color: string }[];
  topEtiquetas?: { nombre: string; color?: string }[];
}

function construirDatosGrafico(
  compras: Compra[],
  comprasAnterior: Compra[],
  ejeX: EjeX,
  ejeY: EjeY,
  desglose: Desglose,
  filtro: FiltroActivo,
  resumenHistorico: BalanceMensualFila[],
): DatosGrafico {
  const items = obtenerItemsFiltrados(compras, filtro);
  const itemsAnterior = obtenerItemsFiltrados(comprasAnterior, filtro);

  const getValor = (item: typeof items[number]): number => {
    if (ejeY === "cantidad") return 1;
    if (ejeY === "ticket") return item.monto_resuelto; // will avg later
    if (ejeY === "franco") return item.pago_franco;
    if (ejeY === "fabiola") return item.pago_fabiola;
    // monto
    if (filtro.personas.length === 1 && filtro.personas[0] === "franco") return item.pago_franco;
    if (filtro.personas.length === 1 && filtro.personas[0] === "fabiola") return item.pago_fabiola;
    return item.monto_resuelto;
  };

  // Group by X
  const grupos = new Map<string, { total: number; count: number; anterior: number }>();
  const porCategoriaDesglose = new Map<string, Record<string, number>>(); // for desglose

  for (const item of items) {
    const key = obtenerClaveX(item, ejeX);
    if (!key) continue;
    const val = getValor(item);
    const existente = grupos.get(key);
    if (existente) {
      existente.total += val;
      existente.count += 1;
    } else {
      grupos.set(key, { total: val, count: 1, anterior: 0 });
    }
  }

  // Previous period (only for "dia" X axis)
  if (ejeX === "dia") {
    for (const item of itemsAnterior) {
      const dia = new Date(`${item.compraFecha}T00:00:00`).getDate();
      const key = `Día ${dia}`;
      const val = ejeY === "franco" ? item.pago_franco : ejeY === "fabiola" ? item.pago_fabiola : item.monto_resuelto;
      const existente = grupos.get(key);
      if (existente) existente.anterior = val;
    }
  }

  // For ticket promedio, divide total by count
  if (ejeY === "ticket") {
    for (const [, g] of grupos.entries()) {
      g.total = g.count > 0 ? g.total / g.count : 0;
    }
  }

  // Build rows
  const rows: Record<string, string | number>[] = [];

  // Sort order
  const ordenKeys = [...grupos.keys()];
  if (ejeX === "dia") ordenKeys.sort((a, b) => parseInt(a.replace("Día ", "")) - parseInt(b.replace("Día ", "")));
  if (ejeX === "semana") ordenKeys.sort((a, b) => parseInt(a.replace("Sem ", "")) - parseInt(b.replace("Sem ", "")));
  if (ejeX === "mes") ordenKeys.sort();
  if (ejeX === "dia-semana") {
    const orden = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    ordenKeys.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  }

  for (const key of ordenKeys) {
    const g = grupos.get(key)!;
    const row: Record<string, string | number> = { label: key, valor: Math.round(g.total) };
    if (g.anterior > 0) row.anterior = Math.round(g.anterior);
    rows.push(row);
  }

  // Override rows based on desglose
  let top5Categorias: { nombre: string; color: string }[] | undefined;
  let topEtiquetas: { nombre: string; color?: string }[] | undefined;

  if (desglose === "categorias-top5") {
    rows.length = 0;
    const catMap = new Map<string, { nombre: string; color: string }>();
    for (const it of items) {
      if (!it.categoria_id || !it.categoria) continue;
      catMap.set(it.categoria_id, { nombre: it.categoria.nombre, color: it.categoria.color || "#6b7280" });
    }
    const top5Global = [...catMap.entries()]
      .map(([id, info]) => ({ ...info, id, total: items.filter((x) => x.categoria_id === id).reduce((a, x) => a + getValor(x), 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    top5Categorias = top5Global;

    for (const key of ordenKeys) {
      const row: Record<string, string | number> = { label: key };
      for (const cat of top5Global) {
        const total = items
          .filter((it) => obtenerClaveX(it, ejeX) === key && it.categoria_id === cat.id)
          .reduce((a, it) => a + getValor(it), 0);
        row[cat.nombre] = Math.round(total);
      }
      rows.push(row);
    }
  } else if (desglose === "persona") {
    rows.length = 0;
    for (const key of ordenKeys) {
      const row: Record<string, string | number> = { label: key };
      let fTotal = 0, faTotal = 0;
      for (const it of items) {
        if (obtenerClaveX(it, ejeX) !== key) continue;
        fTotal += it.pago_franco;
        faTotal += it.pago_fabiola;
      }
      row["Franco"] = Math.round(fTotal);
      row["Fabiola"] = Math.round(faTotal);
      rows.push(row);
    }
  } else if (desglose === "etiqueta") {
    rows.length = 0;
    const etMap = new Map<string, { nombre: string; color?: string }>();
    for (const it of items) {
      for (const et of (it.etiquetas || [])) {
        if (!etMap.has(et.id)) etMap.set(et.id, { nombre: et.nombre, color: et.color });
      }
    }
    const topEt = [...etMap.entries()]
      .map(([id, info]) => ({ ...info, id, total: items.filter((x) => x.etiquetas?.some((e) => e.id === id)).reduce((a, x) => a + getValor(x), 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    topEtiquetas = topEt;

    for (const key of ordenKeys) {
      const row: Record<string, string | number> = { label: key };
      for (const et of topEt) {
        const total = items
          .filter((it) => obtenerClaveX(it, ejeX) === key && it.etiquetas?.some((e) => e.id === et.id))
          .reduce((a, it) => a + getValor(it), 0);
        row[et.nombre] = Math.round(total);
      }
      rows.push(row);
    }
  } else {
    // No desglose - rows already built above
  }

  // For X = "categoria", build from categories directly
  if (ejeX === "categoria") {
    const catTotals = new Map<string, { nombre: string; color: string; total: number }>();
    for (const item of items) {
      if (!item.categoria_id) continue;
      const val = getValor(item);
      const existente = catTotals.get(item.categoria_id);
      if (existente) {
        existente.total += val;
      } else {
        catTotals.set(item.categoria_id, { nombre: item.categoria?.nombre || "Sin categoría", color: item.categoria?.color || "#6b7280", total: val });
      }
    }
    const catsSorted = [...catTotals.values()].sort((a, b) => b.total - a.total).slice(0, 10);
    top5Categorias = catsSorted.slice(0, 5);
    rows.length = 0;
    for (const cat of catsSorted) {
      rows.push({ label: cat.nombre, valor: Math.round(cat.total) });
    }
  }

  if (ejeX === "categoria" && desglose === "etiqueta") {
    const etTotals = new Map<string, { nombre: string; color?: string; total: number }>();
    for (const item of items) {
      for (const et of (item.etiquetas || [])) {
        const val = getValor(item);
        const existente = etTotals.get(et.id);
        if (existente) existente.total += val;
        else etTotals.set(et.id, { nombre: et.nombre, color: et.color, total: val });
      }
    }
    const etsSorted = [...etTotals.values()].sort((a, b) => b.total - a.total);
    topEtiquetas = etsSorted.slice(0, 5);
  }

  return { rows, hasAnterior: ejeX === "dia" && comprasAnterior.length > 0, top5Categorias, topEtiquetas };
}

function obtenerClaveX(item: { compraFecha: string; categoria?: { nombre: string } | null }, ejeX: EjeX): string | null {
  const fecha = new Date(`${item.compraFecha}T00:00:00`);
  if (isNaN(fecha.getTime())) return null;

  switch (ejeX) {
    case "dia": return `Día ${fecha.getDate()}`;
    case "semana": {
      const oneJan = new Date(fecha.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((fecha.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
      return `Sem ${weekNum}`;
    }
    case "mes": return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    case "dia-semana": {
      const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return dias[fecha.getDay()];
    }
    case "categoria": return item.categoria?.nombre || "Sin categoría";
    default: return null;
  }
}
