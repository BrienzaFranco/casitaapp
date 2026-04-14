"use client";

import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { montoFiltrado } from "./FiltroGlobal";
import type { Compra } from "@/types";
import type { FiltroActivo } from "./FiltroGlobal";

interface Props {
  comprasMes: Compra[];
  filtro: FiltroActivo;
  presupuestoTotal: number;
  diasRestantes: number;
  diasEnMes: number;
  diaDelMes: number;
  totalMesAnterior: number;
  diasEnMesAnterior: number;
  proyeccionFinMes: number;
  numBorradores: number;
  totalBorradores: number;
  onPersonaClick: (persona: "franco" | "fabiola") => void;
  onBorradoresClick?: () => void;
  colorFran?: string;
  colorFabi?: string;
}

export function KPIStrip({
  comprasMes,
  filtro,
  presupuestoTotal,
  diasRestantes,
  diasEnMes,
  diaDelMes,
  totalMesAnterior,
  diasEnMesAnterior,
  proyeccionFinMes,
  numBorradores,
  totalBorradores,
  onPersonaClick,
  onBorradoresClick,
  colorFran = "#534AB7",
  colorFabi = "#0F6E56",
}: Props) {
  const total = montoFiltrado(comprasMes, filtro);

  // Persona contributions
  const totalFranco = montoFiltrado(comprasMes, { ...filtro, personas: ["franco"] });
  const totalFabiola = montoFiltrado(comprasMes, { ...filtro, personas: ["fabiola"] });

  // Ticket promedio
  const numCompras = comprasMes.filter((c) => {
    if (filtro.categorias.length > 0 && !c.items.some((i) => i.categoria_id && filtro.categorias.includes(i.categoria_id))) return false;
    if (filtro.etiquetas.length > 0) {
      const hasTag = c.items.some((i) => i.etiquetas?.some((e) => filtro.etiquetas.includes(e.id))) ||
        c.etiquetas_compra?.some((e) => filtro.etiquetas.includes(e.id));
      if (!hasTag) return false;
    }
    return true;
  }).length;
  const ticketPromedio = numCompras > 0 ? total / numCompras : 0;

  // Promedio diario
  const promedioDiario = diasEnMes > 0 ? total / diasEnMes : 0;

  // Budget efficiency: (diasTranscurridos/diasDelMes) / (total/presupuesto) * 100
  const pctTiempo = diasEnMes > 0 ? (diaDelMes / diasEnMes) * 100 : 0;
  const pctGastado = presupuestoTotal > 0 ? (total / presupuestoTotal) * 100 : 0;
  const eficiencia = pctGastado > 0 ? Math.round((pctTiempo / pctGastado) * 100) : 100;

  // Variacion vs mes anterior
  const variacion = totalMesAnterior > 0 ? ((total - totalMesAnterior) / totalMesAnterior) * 100 : 0;

  // Big expense streak (threshold = avg daily * 3)
  const promedioHistorico = totalMesAnterior > 0 ? totalMesAnterior / 30 : 0;
  const umbralGrande = Math.round(promedioHistorico * 3);
  let ultimoDiaGrande = 0;
  for (const compra of comprasMes) {
    const totalCompra = compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
    if (totalCompra >= umbralGrande) {
      const d = new Date(`${compra.fecha}T00:00:00`).getDate();
      if (d > ultimoDiaGrande) ultimoDiaGrande = d;
    }
  }
  const diasSinGrande = ultimoDiaGrande > 0 ? diaDelMes - ultimoDiaGrande : 0;

  const effColor = eficiencia >= 100 ? "#1D9E75" : eficiencia >= 70 ? "#EF9F27" : "#E24B4A";
  const proyeccionColor = proyeccionFinMes > presupuestoTotal && presupuestoTotal > 0 ? "#E24B4A" : "#1D9E75";

  const kpis = [
    {
      label: "Franco pagó",
      value: formatearPeso(totalFranco),
      sub: totalMesAnterior > 0 ? undefined : undefined,
      color: colorFran,
      clickable: true,
      onClick: () => onPersonaClick("franco"),
    },
    {
      label: "Fabiola pagó",
      value: formatearPeso(totalFabiola),
      sub: undefined,
      color: colorFabi,
      clickable: true,
      onClick: () => onPersonaClick("fabiola"),
    },
    {
      label: "Ticket prom.",
      value: formatearPeso(Math.round(ticketPromedio)),
      sub: numCompras > 0 ? `${numCompras} compras` : undefined,
      color: "var(--color-text-primary, var(--text-on-surface))",
    },
    {
      label: "Proyección",
      value: formatearPeso(Math.round(proyeccionFinMes)),
      sub: `${diasRestantes} días restantes`,
      color: proyeccionColor,
    },
    {
      label: "Eficiencia",
      value: `${eficiencia}%`,
      sub: "ritmo de gasto",
      color: effColor,
    },
    {
      label: "Borradores",
      value: numBorradores > 0 ? `${numBorradores}` : "0",
      sub: numBorradores > 0 ? formatearPeso(totalBorradores) : "sin pendientes",
      color: numBorradores > 0 ? "#EF9F27" : "#1D9E75",
      clickable: numBorradores > 0 && !!onBorradoresClick,
      onClick: onBorradoresClick,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 px-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[12px] px-2.5 py-2 ${kpi.clickable ? "cursor-pointer hover:border-outline-variant/20 transition-colors" : ""}`}
          onClick={kpi.clickable ? kpi.onClick : undefined}
        >
          <p className="text-[9px] text-on-surface-variant/50 mb-0.5">{kpi.label}</p>
          <p className="text-[14px] font-medium leading-tight tabular-nums" style={{ color: kpi.color }}>
            {kpi.value}
          </p>
          {kpi.sub && (
            <p className="text-[9px] text-on-surface-variant/40 mt-0.5 truncate">{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
