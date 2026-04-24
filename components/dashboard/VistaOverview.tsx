"use client";

import { useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download,
  Plus,
  AlertTriangle,
  Check,
  ArrowUpRight,
  FileClock,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { formatearPeso, formatearMesCorto } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import {
  FiltroGlobal,
  type FiltroActivo,
  montoFiltrado,
} from "@/components/dashboard/FiltroGlobal";
import {
  SelectorPeriodo,
  type PeriodoActivo,
  filtrarPorPeriodo,
} from "@/components/dashboard/SelectorPeriodo";
import { DeltaBadge } from "@/components/dashboard/DeltaBadge";
import { DonutCategorias } from "@/components/dashboard/DonutCategorias";
import { GraficoDiarioBarras } from "@/components/dashboard/GraficoDiarioBarras";
import type { CategoriaBalance, Compra, Item, ResumenBalance, BalanceMensualFila, Categoria, Etiqueta, Subcategoria } from "@/types";

export interface OverviewData {
  compras: Compra[];
  comprasMes: Compra[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  categoriasMes: CategoriaBalance[];
  etiquetasMes: Array<{ etiqueta: { id: string; nombre: string; color: string }; total: number; cantidad_items: number }>;
  resumenMes: ResumenBalance;
  resumenHistorico: BalanceMensualFila[];
  saldoAbierto: ResumenBalance;
  nombres: { franco: string; fabiola: string };
  mesSeleccionado: string;
  numBorradores: number;
}

interface Callbacks {
  onCategoriaClick: (cat: CategoriaBalance) => void;
  onBalanceClick: () => void;
  onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) => void;
  onDiaClick: (dia: number) => void;
}

interface VistaOverviewProps {
  data: OverviewData;
  callbacks: Callbacks;
  filtro: FiltroActivo;
  setFiltro: (f: FiltroActivo) => void;
  periodo: PeriodoActivo;
  setPeriodo: (p: PeriodoActivo) => void;
  mesAnterior: string | null;
  diaSeleccionado: number | null;
}

export function VistaOverview({ data, callbacks, filtro, setFiltro, periodo, setPeriodo, mesAnterior, diaSeleccionado }: VistaOverviewProps) {
  const comprasMesAnteriorData = useMemo(
    () => (mesAnterior ? data.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : []),
    [data.compras, mesAnterior],
  );

  const comprasPeriodo = useMemo(() => {
    if (periodo.tipo === "este-mes") return data.comprasMes;
    if (periodo.tipo === "mes-anterior") {
      return mesAnterior ? data.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : [];
    }
    return filtrarPorPeriodo(data.compras, {
      tipo: periodo.tipo,
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
  }, [periodo, data.comprasMes, data.compras, mesAnterior]);

  const comprasDiaSeleccionado = useMemo(() => {
    if (diaSeleccionado == null) return [];
    return comprasPeriodo.filter((c) => parseInt(c.fecha.slice(8, 10), 10) === diaSeleccionado);
  }, [comprasPeriodo, diaSeleccionado]);

  const hoy = new Date();
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  const presupuestoTotal = data.categorias.reduce((acc, cat) => acc + (cat.limite_mensual ?? 0), 0);
  const totalGastado = montoFiltrado(comprasPeriodo, filtro);
  const restante = presupuestoTotal - totalGastado;
  const pctUsado = presupuestoTotal > 0 ? (totalGastado / presupuestoTotal) * 100 : 0;
  const totalMesAnterior = montoFiltrado(comprasMesAnteriorData, filtro);

  const categoriasAlerta = useMemo(() => {
    return data.categoriasMes
      .filter((c) => c.categoria.limite_mensual && c.categoria.limite_mensual > 0)
      .filter((c) => (c.porcentaje ?? 0) >= 80)
      .sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
      .slice(0, 3);
  }, [data.categoriasMes]);

  const topItems = useMemo(() => {
    const items: Array<{ item: Item; lugar: string; fecha: string; compraId: string }> = [];
    const source = diaSeleccionado != null ? comprasDiaSeleccionado : comprasPeriodo;
    for (const compra of source) {
      for (const item of compra.items) {
        items.push({ item, lugar: compra.nombre_lugar || "Sin lugar", fecha: compra.fecha, compraId: compra.id });
      }
    }
    items.sort((a, b) => b.item.monto_resuelto - a.item.monto_resuelto);
    return items.slice(0, 8);
  }, [diaSeleccionado, comprasDiaSeleccionado, comprasPeriodo]);

  function exportar() {
    exportarExcel(comprasPeriodo, data.resumenMes, data.resumenHistorico, data.categoriasMes, data.etiquetasMes, data.mesSeleccionado);
    toast.success(`Exportado (${comprasPeriodo.length} compras)`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-headline text-lg font-semibold tracking-tight text-on-surface">Dashboard</h1>
        <SelectorPeriodo periodo={periodo} setPeriodo={setPeriodo} mesActualLabel={formatearMesCorto(data.mesSeleccionado)} />
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-3">
        <FiltroGlobal
          filtro={filtro}
          setFiltro={setFiltro}
          categorias={data.categorias}
          etiquetas={data.etiquetas}
          subcategorias={data.subcategorias}
        />
      </div>

      {/* Total gastado */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-outline">
              {diaSeleccionado != null ? `Dia ${diaSeleccionado}` : (periodo.label || "Gastos del per\u00edodo")}
            </p>
            <p className="font-headline text-3xl font-bold text-on-surface mt-1 tabular-nums">
              {formatearPeso(totalGastado)}
            </p>
            {!diaSeleccionado && totalMesAnterior > 0 && (
              <DeltaBadge actual={totalGastado} anterior={totalMesAnterior} formato="pesos" />
            )}
          </div>
          {presupuestoTotal > 0 && !diaSeleccionado && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-outline">Presupuesto</p>
              <p className={`text-sm font-semibold tabular-nums mt-1 ${pctUsado >= 100 ? "text-error" : pctUsado >= 80 ? "text-[#ED7D31]" : "text-tertiary"}`}>
                {pctUsado >= 100 ? `${Math.round(pctUsado)}%` : `${Math.round(pctUsado)}% usado`}
              </p>
              <p className="text-[10px] text-on-surface-variant">{formatearPeso(restante > 0 ? restante : 0)} restante</p>
            </div>
          )}
        </div>

        {/* Bar chart diario */}
        {comprasPeriodo.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-on-surface-variant" />
              <p className="text-[10px] uppercase tracking-widest text-outline">
                Gastos diarios {diaSeleccionado != null ? "- Dia " + diaSeleccionado : ""}
              </p>
              {diaSeleccionado != null && (
                <button onClick={() => callbacks.onDiaClick(diaSeleccionado)} className="ml-auto text-[10px] text-secondary font-medium hover:underline">
                  Ver todos
                </button>
              )}
            </div>
            <GraficoDiarioBarras
              compras={comprasPeriodo}
              diasEnMes={diasEnMes}
              color="var(--secondary)"
              onDiaClick={(dia) => callbacks.onDiaClick(dia)}
              diaSeleccionado={diaSeleccionado}
            />
            <p className="text-[9px] text-on-surface-variant/60 text-center mt-1">Toca una barra para filtrar por dia</p>
          </div>
        )}

        {/* Items del dia seleccionado */}
        {diaSeleccionado != null && comprasDiaSeleccionado.length > 0 && (
          <div className="mt-3 pt-3 border-t border-outline-variant/10 space-y-1">
            {topItems.map(({ item, lugar, fecha, compraId }, i) => (
              <button
                key={`dia-${diaSeleccionado}-${i}`}
                type="button"
                onClick={() => callbacks.onItemClick(item, lugar, fecha, compraId)}
                className="w-full flex items-center gap-2 py-1.5 text-left hover:bg-surface-container-high/50 rounded-lg px-2 transition-colors -mx-2"
              >
                <span className="text-xs text-on-surface truncate flex-1">{item.descripcion || "Sin descripcion"}</span>
                <span className="text-xs font-semibold tabular-nums text-on-surface shrink-0">{formatearPeso(item.monto_resuelto)}</span>
                <ChevronRight className="h-3 w-3 text-on-surface-variant/30" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alertas */}
      {categoriasAlerta.length > 0 && !diaSeleccionado && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#ED7D31]" />
            <p className="text-[10px] uppercase tracking-widest text-outline">Alertas</p>
          </div>
          {categoriasAlerta.map((cat) => {
            const pct = cat.porcentaje ?? 0;
            const excedido = pct >= 100;
            return (
              <button
                key={cat.categoria.id}
                type="button"
                onClick={() => callbacks.onCategoriaClick(cat)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface font-medium">{cat.categoria.nombre}</span>
                  <span className={`tabular-nums font-semibold ${excedido ? "text-error" : "text-[#ED7D31]"}`}>
                    {formatearPeso(cat.total)} / {formatearPeso(cat.categoria.limite_mensual!)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${excedido ? "bg-error" : "bg-[#ED7D31]"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Donut de categorias */}
      {data.categoriasMes.filter(c => c.total > 0).length > 0 && !diaSeleccionado && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
          <p className="text-[10px] uppercase tracking-widest text-outline mb-3">Categor&iacute;as</p>
          <DonutCategorias categorias={data.categoriasMes} onCategoriaClick={callbacks.onCategoriaClick} />
        </div>
      )}

      {/* Balance */}
      {!diaSeleccionado && (() => {
        const saldo = data.saldoAbierto;
        const b = saldo.balance;
        const estaAlDia = !saldo.deudor || Math.abs(b) < 0.01;
        const debeTexto = !estaAlDia && saldo.deudor && saldo.acreedor
          ? `${saldo.deudor} le debe ${formatearPeso(Math.abs(b))} a ${saldo.acreedor}`
          : "Est\u00e1n al d\u00eda, sin deudas pendientes";

        return (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {estaAlDia ? <Check className="h-5 w-5 text-tertiary" /> : <AlertTriangle className="h-5 w-5 text-[#ED7D31]" />}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline">Balance</p>
                  <p className="text-sm font-medium text-on-surface mt-0.5">{debeTexto}</p>
                </div>
              </div>
              <button type="button" onClick={callbacks.onBalanceClick} className="text-xs text-secondary font-medium flex items-center gap-1 hover:underline shrink-0">
                Detalle <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
              <span>{data.nombres.franco}: pag&oacute; {formatearPeso(saldo.franco_pago)} / le toca {formatearPeso(saldo.franco_corresponde)}</span>
              <span>{data.nombres.fabiola}: pag&oacute; {formatearPeso(saldo.fabiola_pago)} / le toca {formatearPeso(saldo.fabiola_corresponde)}</span>
            </div>
          </div>
        );
      })()}

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
          <p className="text-[10px] uppercase tracking-widest text-outline mb-2">
            {diaSeleccionado != null ? `Items del dia ${diaSeleccionado}` : "Top gastos"}
          </p>
          <div className="space-y-0.5">
            {topItems.map(({ item, lugar, fecha, compraId }, i) => (
              <button
                key={`${item.compra_id}-${item.id || i}-${i}`}
                type="button"
                onClick={() => callbacks.onItemClick(item, lugar, fecha, compraId)}
                className="w-full flex items-center gap-3 py-2 text-left hover:bg-surface-container-high/50 rounded-lg px-2 transition-colors -mx-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">{i + 1}</span>
                <span className="text-sm text-on-surface truncate flex-1">{item.descripcion || "Sin descripci\u00f3n"}</span>
                <span className="text-sm font-semibold tabular-nums text-on-surface shrink-0">{formatearPeso(item.monto_resuelto)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Borradores + acciones */}
      <div className="flex gap-2 pb-2">
        {data.numBorradores > 0 && (
          <Link href="/borradores" className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
            <FileClock className="h-4 w-4" /> {data.numBorradores} borrador{data.numBorradores !== 1 ? "es" : ""}
          </Link>
        )}
        <button type="button" onClick={exportar} className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
        <Link href="/anotador-rapido" className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary text-on-secondary text-sm font-semibold hover:bg-secondary/90 active:scale-[0.98] transition-all">
          <Plus className="h-4 w-4" /> Nueva compra
        </Link>
      </div>
    </div>
  );
}
