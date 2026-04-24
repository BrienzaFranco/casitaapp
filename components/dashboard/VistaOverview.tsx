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
} from "lucide-react";
import { formatearPeso, formatearMesCorto } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { obtenerMesAnterior } from "@/lib/calculos";
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
import { SparklineMes } from "@/components/dashboard/SparklineMes";
import type { CategoriaBalance, Item } from "@/types";

interface Callbacks {
  onCategoriaClick: (cat: CategoriaBalance) => void;
  onBalanceClick: () => void;
  onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) => void;
}

interface VistaOverviewProps {
  callbacks: Callbacks;
  filtro: FiltroActivo;
  setFiltro: (f: FiltroActivo) => void;
  periodo: PeriodoActivo;
  setPeriodo: (p: PeriodoActivo) => void;
}

export function VistaOverview({ callbacks, filtro, setFiltro, periodo, setPeriodo }: VistaOverviewProps) {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;

  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);

  const comprasPeriodo = useMemo(() => {
    if (periodo.tipo === "este-mes") return balance.comprasMes;
    if (periodo.tipo === "mes-anterior") {
      return mesAnterior ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : [];
    }
    return filtrarPorPeriodo(balance.compras.compras, {
      tipo: periodo.tipo,
      desde: periodo.desde,
      hasta: periodo.hasta,
    });
  }, [periodo, balance.comprasMes, balance.compras.compras, mesAnterior]);

  const comprasMesAnteriorData = useMemo(
    () => (mesAnterior ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior) : []),
    [balance.compras.compras, mesAnterior],
  );

  const hoy = new Date();
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

  const presupuestoTotal = balance.categorias.categorias.reduce((acc, cat) => acc + (cat.limite_mensual ?? 0), 0);
  const totalGastado = montoFiltrado(comprasPeriodo, filtro);
  const restante = presupuestoTotal - totalGastado;
  const pctUsado = presupuestoTotal > 0 ? (totalGastado / presupuestoTotal) * 100 : 0;
  const totalMesAnterior = montoFiltrado(comprasMesAnteriorData, filtro);

  const numBorradores = balance.compras.compras.filter((c) => c.estado === "borrador").length;

  const categoriasAlerta = useMemo(() => {
    return balance.categoriasMes
      .filter((c) => c.categoria.limite_mensual && c.categoria.limite_mensual > 0)
      .filter((c) => (c.porcentaje ?? 0) >= 80)
      .sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
      .slice(0, 3);
  }, [balance.categoriasMes]);

  const topItems = useMemo(() => {
    const items: Array<{ item: Item; lugar: string; fecha: string; compraId: string }> = [];
    for (const compra of comprasPeriodo) {
      for (const item of compra.items) {
        items.push({ item, lugar: compra.nombre_lugar || "Sin lugar", fecha: compra.fecha, compraId: compra.id });
      }
    }
    items.sort((a, b) => b.item.monto_resuelto - a.item.monto_resuelto);
    return items.slice(0, 5);
  }, [comprasPeriodo]);

  function exportar() {
    exportarExcel(comprasPeriodo, balance.resumenMes, balance.resumenHistorico, balance.categoriasMes, balance.etiquetasMes, balance.mesSeleccionado);
    toast.success(`Exportado (${comprasPeriodo.length} compras)`);
  }

  return (
    <div className="space-y-4">
      {/* Header sticky */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-headline text-lg font-semibold tracking-tight text-on-surface">Dashboard</h1>
        <SelectorPeriodo periodo={periodo} setPeriodo={setPeriodo} mesActualLabel={formatearMesCorto(balance.mesSeleccionado)} />
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-3">
        <FiltroGlobal
          filtro={filtro}
          setFiltro={setFiltro}
          categorias={balance.categorias.categorias}
          etiquetas={balance.categorias.etiquetas}
          subcategorias={balance.categorias.subcategorias}
        />
      </div>

      {/* Total gastado + sparkline */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-outline">
              {periodo.label || "Gastos del per\u00edodo"}
            </p>
            <p className="font-headline text-3xl font-bold text-on-surface mt-1 tabular-nums">
              {formatearPeso(totalGastado)}
            </p>
            {totalMesAnterior > 0 && (
              <DeltaBadge actual={totalGastado} anterior={totalMesAnterior} formato="pesos" />
            )}
          </div>
          {presupuestoTotal > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-outline">Presupuesto</p>
              <p className={`text-sm font-semibold tabular-nums mt-1 ${pctUsado >= 100 ? "text-error" : pctUsado >= 80 ? "text-[#ED7D31]" : "text-tertiary"}`}>
                {pctUsado >= 100 ? `${Math.round(pctUsado)}%` : `${Math.round(pctUsado)}% usado`}
              </p>
              <p className="text-[10px] text-on-surface-variant">{formatearPeso(restante > 0 ? restante : 0)} restante</p>
            </div>
          )}
        </div>
        {comprasPeriodo.length > 0 && (
          <div className="mt-2">
            <SparklineMes compras={comprasPeriodo} color={colorFran} diasEnMes={diasEnMes} />
          </div>
        )}
      </div>

      {/* Alertas */}
      {categoriasAlerta.length > 0 && (
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
                  <div
                    className={`h-full rounded-full transition-all ${excedido ? "bg-error" : "bg-[#ED7D31]"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Donut de categorías */}
      {balance.categoriasMes.filter(c => c.total > 0).length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
          <p className="text-[10px] uppercase tracking-widest text-outline mb-3">Categor&iacute;as</p>
          <DonutCategorias
            categorias={balance.categoriasMes}
            onCategoriaClick={callbacks.onCategoriaClick}
          />
        </div>
      )}

      {/* Balance */}
      {(() => {
        const saldo = balance.saldoAbierto;
        const b = saldo.balance;
        const estaAlDia = !saldo.deudor || Math.abs(b) < 0.01;
        const debeTexto = !estaAlDia && saldo.deudor && saldo.acreedor
          ? `${saldo.deudor} le debe ${formatearPeso(Math.abs(b))} a ${saldo.acreedor}`
          : "Est\u00e1n al d\u00eda, sin deudas pendientes";

        return (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {estaAlDia ? (
                  <Check className="h-5 w-5 text-tertiary" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-[#ED7D31]" />
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-outline">Balance</p>
                  <p className="text-sm font-medium text-on-surface mt-0.5">{debeTexto}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={callbacks.onBalanceClick}
                className="text-xs text-secondary font-medium flex items-center gap-1 hover:underline shrink-0"
              >
                Detalle <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
              <span>{balance.nombres.franco}: pag&oacute; {formatearPeso(saldo.franco_pago)} / le toca {formatearPeso(saldo.franco_corresponde)}</span>
              <span>{balance.nombres.fabiola}: pag&oacute; {formatearPeso(saldo.fabiola_pago)} / le toca {formatearPeso(saldo.fabiola_corresponde)}</span>
            </div>
          </div>
        );
      })()}

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
          <p className="text-[10px] uppercase tracking-widest text-outline mb-2">Top gastos</p>
          <div className="space-y-0.5">
            {topItems.map(({ item, lugar, fecha, compraId }, i) => (
              <button
                key={`${item.compra_id}-${item.id}-${i}`}
                type="button"
                onClick={() => callbacks.onItemClick(item, lugar, fecha, compraId)}
                className="w-full flex items-center gap-3 py-2 text-left hover:bg-surface-container-high/50 rounded-lg px-2 transition-colors -mx-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
                  {i + 1}
                </span>
                <span className="text-sm text-on-surface truncate flex-1">{item.descripcion || "Sin descripci\u00f3n"}</span>
                <span className="text-sm font-semibold tabular-nums text-on-surface shrink-0">{formatearPeso(item.monto_resuelto)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Borradores + acciones */}
      <div className="flex gap-2">
        {numBorradores > 0 && (
          <Link
            href="/borradores"
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <FileClock className="h-4 w-4" /> {numBorradores} borrador{numBorradores !== 1 ? "es" : ""}
          </Link>
        )}
        <button
          type="button"
          onClick={exportar}
          className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-container-low border border-outline-variant/15 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
        <Link
          href="/anotador-rapido"
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-secondary text-on-secondary text-sm font-semibold hover:bg-secondary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" /> Nueva compra
        </Link>
      </div>
    </div>
  );
}
