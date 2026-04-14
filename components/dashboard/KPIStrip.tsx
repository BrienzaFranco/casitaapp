"use client";

import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { montoFiltrado } from "./FiltroGlobal";
import type { Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";

// Re-export to avoid type error
type Filtro = FiltroActivo;

interface Props {
  comprasMes: Compra[];
  filtro: Filtro;
  presupuestoTotal: number;
  diasRestantes: number;
  diasEnMes: number;
  totalMesAnterior: number;
  diasEnMesAnterior: number;
}

export function KPIStrip({
  comprasMes,
  filtro,
  presupuestoTotal,
  diasRestantes,
  diasEnMes,
  totalMesAnterior,
  diasEnMesAnterior,
}: Props) {
  // Total with persona filter applied
  const total = montoFiltrado(comprasMes, filtro);

  // Persona contributions
  const totalFranco = montoFiltrado(comprasMes, { ...filtro, persona: "franco" });
  const totalFabiola = montoFiltrado(comprasMes, { ...filtro, persona: "fabiola" });

  // Ticket promedio
  const numCompras = filtro.categoriaId || filtro.etiquetaId
    ? comprasMes.filter((c) => {
        if (filtro.categoriaId && !c.items.some((i) => i.categoria_id === filtro.categoriaId)) return false;
        if (filtro.etiquetaId && !c.items.some((i) => i.etiquetas?.some((e) => e.id === filtro.etiquetaId)) && !c.etiquetas_compra?.some((e) => e.id === filtro.etiquetaId)) return false;
        return true;
      }).length
    : comprasMes.length;
  const ticketPromedio = numCompras > 0 ? total / numCompras : 0;

  // Promedio diario
  const promedioDiario = diasEnMes > 0 ? total / diasEnMes : 0;

  // Budget health
  const budgetHealth = presupuestoTotal > 0 ? (1 - total / presupuestoTotal) * 100 : 100;

  // Variacion vs mes anterior
  const variacion = totalMesAnterior > 0 ? ((total - totalMesAnterior) / totalMesAnterior) * 100 : 0;

  const healthColor = budgetHealth < 0 ? "#E24B4A" : budgetHealth < 20 ? "#EF9F27" : "#1D9E75";

  const kpis = [
    {
      label: filtro.persona === "franco" ? "Franco" : filtro.persona === "fabiola" ? "Fabiola" : "Total",
      value: formatearPeso(total),
      sub: filtro.persona !== "todos" ? `de ${formatearPeso(montoFiltrado(comprasMes, { ...filtro, persona: "todos" }))}` : undefined,
      color: filtro.persona === "franco" ? "var(--color-franco, #534AB7)" : filtro.persona === "fabiola" ? "var(--color-fabiola, #0F6E56)" : "var(--color-text-primary, var(--text-on-surface))",
    },
    {
      label: "Prom. diario",
      value: formatearPeso(Math.round(promedioDiario)),
      sub: totalMesAnterior > 0
        ? `${variacion >= 0 ? "↑" : "↓"} ${formatearPorcentaje(Math.abs(Math.round(variacion)))} vs mes ant.`
        : undefined,
      color: variacion < 0 ? "#0F6E56" : variacion > 5 ? "#854F0B" : "var(--color-text-primary, var(--text-on-surface))",
    },
    {
      label: "Ticket promedio",
      value: formatearPeso(Math.round(ticketPromedio)),
      sub: numCompras > 0 ? `${numCompras} compras` : undefined,
      color: "var(--color-text-primary, var(--text-on-surface))",
    },
    {
      label: "Budget",
      value: formatearPorcentaje(Math.round(budgetHealth)),
      sub: presupuestoTotal > 0 ? `${diasRestantes} días restantes` : undefined,
      color: healthColor,
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-3 py-2.5"
        >
          <p className="text-[10px] text-on-surface-variant/50 mb-0.5">{kpi.label}</p>
          <p className="text-[16px] font-medium leading-tight" style={{ color: kpi.color }}>
            {kpi.value}
          </p>
          {kpi.sub && (
            <p className="text-[10px] text-on-surface-variant/40 mt-0.5">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
