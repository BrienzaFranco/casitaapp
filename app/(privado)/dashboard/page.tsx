"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Download, Plus, TrendingUp, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearPeso, formatearPorcentaje, formatearMesLabel, formatearMesCorto } from "@/lib/formatear";
import { mesClave, fechaLocalISO, hexToRgba } from "@/lib/utiles";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const router = useRouter();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });

  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);
  const mesAnteriorLabel = mesAnterior ? formatearMesCorto(mesAnterior) : "";

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
  const diaDelMes = hoy.getDate();
  const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diasRestantes = diasEnMes - diaDelMes;

  const presupuestoTotal = balance.categorias.categorias.reduce(
    (acc, cat) => acc + (cat.limite_mensual ?? 0),
    0,
  );

  const totalGastado = montoFiltrado(comprasPeriodo, filtro);
  const restante = presupuestoTotal - totalGastado;
  const pctUsado = presupuestoTotal > 0 ? (totalGastado / presupuestoTotal) * 100 : 0;

  const totalMesAnterior = montoFiltrado(comprasMesAnteriorData, filtro);

  const numBorradores = balance.compras.compras.filter((c) => c.estado === "borrador").length;
  const totalBorradores = balance.compras.compras
    .filter((c) => c.estado === "borrador")
    .reduce((acc, c) => acc + c.items.reduce((a, i) => a + i.monto_resuelto, 0), 0);

  // Categorías con alertas (excedidas o cerca del límite)
  const categoriasAlerta = useMemo(() => {
    return balance.categoriasMes
      .filter((c) => c.categoria.limite_mensual && c.categoria.limite_mensual > 0)
      .filter((c) => (c.porcentaje ?? 0) >= 80)
      .sort((a, b) => (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
      .slice(0, 3);
  }, [balance.categoriasMes]);

  function exportar() {
    exportarExcel(comprasPeriodo, balance.resumenMes, balance.resumenHistorico, balance.categoriasMes, balance.etiquetasMes, balance.mesSeleccionado);
    toast.success(`Exportado (${comprasPeriodo.length} compras)`);
  }

  async function saldarBalance() {
    try {
      const hoyStr = fechaLocalISO();
      const resumen = balance.saldoAbierto.deudor
        ? `${balance.saldoAbierto.deudor} debia ${formatearPeso(Math.abs(balance.saldoAbierto.balance))} a ${balance.saldoAbierto.acreedor}`
        : "sin deuda";

      await balance.cortes.crearCorte({
        fecha_corte: hoyStr,
        nota: `Quedaron a mano (${hoyStr}): ${resumen}. Franco pago ${formatearPeso(balance.saldoAbierto.franco_pago)}, Fabiola pago ${formatearPeso(balance.saldoAbierto.fabiola_pago)}.`,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });

      toast.success("Listo: quedaron a mano.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo marcar el corte.";
      toast.error(msg);
    }
  }

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;
  if (sinCompras) {
    return (
      <section>
        <div className="rounded-xl border border-outline-variant/10 p-5 bg-surface-container-lowest">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mb-1">Dashboard</p>
          <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface mt-0.5">Sin compras registradas</h2>
          <p className="text-sm text-on-surface-variant mt-1">Agregá tu primera compra para ver las métricas acá.</p>
        </div>
      </section>
    );
  }

  const heroBadgeClass = pctUsado > 100
    ? "bg-error-container text-error"
    : pctUsado > 75
      ? "bg-secondary-fixed text-on-secondary-fixed-variant"
      : "bg-tertiary-fixed text-on-tertiary-fixed-variant";

  const heroBarColor = pctUsado > 100
    ? "var(--color-error)"
    : pctUsado > 75
      ? "var(--color-secondary)"
      : "var(--color-tertiary)";

  return (
    <div className="space-y-5">
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          mesActualLabel={formatearMesLabel(balance.mesSeleccionado)}
          mesAnteriorLabel={mesAnteriorLabel}
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={exportar}
            className="w-9 h-9 rounded-xl border border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Exportar Excel"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/nueva-compra")}
            className="w-9 h-9 rounded-xl border border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Nueva compra"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <FiltroGlobal
        filtro={filtro}
        setFiltro={(f) => { setFiltro(f); }}
        categorias={balance.categorias.categorias}
        etiquetas={balance.categorias.etiquetas}
        subcategorias={balance.categorias.subcategorias}
      />

      {/* ── HERO: Gasto del período ── */}
      <div className="rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/10">
        <div className="px-5 py-5 pb-3">
          <p className="text-[10px] font-medium uppercase tracking-[.08em] text-on-surface-variant/50 mb-1">
            Total gastado
          </p>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-medium leading-none text-on-surface tracking-tight">
                {formatearPeso(totalGastado)}
              </span>
              {presupuestoTotal > 0 && (
                <span className="text-[13px] text-on-surface-variant/50 leading-none pb-1">
                  de {formatearPeso(presupuestoTotal)}
                </span>
              )}
            </div>
            {presupuestoTotal > 0 && (
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${heroBadgeClass}`}>
                {formatearPorcentaje(Math.round(pctUsado))} usado
              </span>
            )}
          </div>

          {presupuestoTotal > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[12px] text-on-surface-variant/70">
                Presupuesto: <strong className="text-on-surface font-medium">{formatearPeso(presupuestoTotal)}</strong> · Quedan{" "}
                <strong className="text-on-surface font-medium">{formatearPeso(restante)}</strong> para{" "}
                <strong className="text-on-surface font-medium">{diasRestantes} días</strong>
                {totalMesAnterior > 0 && (
                  <span className="ml-1.5">
                    <DeltaBadge actual={totalGastado} anterior={totalMesAnterior} />
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {presupuestoTotal > 0 && (
          <>
            <div className="h-2.5 bg-surface-container-low relative overflow-hidden">
              <div
                className="h-full transition-all duration-500 rounded-r-full"
                style={{ width: `${Math.min(pctUsado, 100)}%`, backgroundColor: heroBarColor }}
              />
            </div>
            <div className="flex justify-between px-5 pb-3 pt-1.5 text-[10px] text-on-surface-variant/40">
              <span>$0</span>
              <span>{formatearPeso(presupuestoTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── ALERTAS: Categorías en riesgo ── */}
      {categoriasAlerta.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50">
            Alertas
          </p>
          {categoriasAlerta.map((cat) => {
            const limite = Number(cat.categoria.limite_mensual);
            const pct = cat.porcentaje ?? 0;
            const excedido = pct > 100;
            const restanteCat = limite - cat.total;

            return (
              <div
                key={cat.categoria.id}
                className={`rounded-xl px-4 py-3 border ${excedido ? "bg-error-container/30 border-error/20" : "bg-secondary-fixed/40 border-secondary/15"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.categoria.color }} />
                    <span className="text-[13px] font-medium text-on-surface">{cat.categoria.nombre}</span>
                    {excedido && <AlertTriangle className="h-3.5 w-3.5 text-error" />}
                  </div>
                  <span className={`text-[13px] font-medium ${excedido ? "text-error" : "text-on-secondary-fixed-variant"}`}>
                    {excedido ? `+${formatearPeso(Math.abs(restanteCat))}` : `${formatearPeso(restanteCat)} rest.`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: excedido ? "var(--color-error)" : "var(--color-secondary)",
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-on-surface-variant/50">
                  {formatearPeso(cat.total)} de {formatearPeso(limite)} · {formatearPorcentaje(Math.round(pct))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BALANCE ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50">
          Balance
        </p>
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-2.5">
          <div className="flex">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-surface-container-lowest shrink-0"
              style={{ backgroundColor: hexToRgba(colorFran, 0.15), color: colorFran, zIndex: 1 }}
            >
              {balance.nombres.franco.slice(0, 2)}
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-surface-container-lowest shrink-0 -ml-2"
              style={{ backgroundColor: hexToRgba(colorFabi, 0.15), color: colorFabi }}
            >
              {balance.nombres.fabiola.slice(0, 2)}
            </div>
          </div>

          {balance.resumenMes.deudor ? (
            <div className="flex-1 text-[12px] text-on-surface-variant/70">
              <strong className="text-on-surface font-medium">{balance.resumenMes.deudor}</strong> le debe a{" "}
              <strong className="text-on-surface font-medium">{balance.resumenMes.acreedor}</strong>
            </div>
          ) : (
            <div className="flex-1 text-[12px] text-on-surface-variant/70 flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-tertiary" />
              <span>Al día, <strong className="text-on-surface font-medium">sin deuda</strong></span>
            </div>
          )}

          {balance.resumenMes.deudor ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[15px] font-medium text-error">{formatearPeso(Math.abs(balance.resumenMes.balance))}</span>
              <button
                type="button"
                onClick={saldarBalance}
                className="text-[11px] px-2.5 py-1 rounded-full border border-outline-variant/20 bg-transparent text-on-surface-variant/70 hover:bg-surface-container-low transition-colors whitespace-nowrap"
              >
                Saldar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[15px] font-medium text-tertiary shrink-0">
              <Check className="h-4 w-4" />
              <span>Al día</span>
            </div>
          )}
        </div>
      </div>

      {/* ── BORRADORES ── */}
      {(numBorradores > 0 || totalBorradores > 0) && (
        <button
          type="button"
          onClick={() => router.push("/borradores")}
          className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 flex items-center justify-between hover:bg-surface-container transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-on-surface">Borradores pendientes</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-on-secondary font-bold">
              {numBorradores}
            </span>
          </div>
          <span className="text-[14px] font-medium text-on-surface-variant">{formatearPeso(totalBorradores)}</span>
        </button>
      )}

      {/* ── EXPLORAR ── */}
      <button
        type="button"
        onClick={() => router.push("/dashboard/explorar")}
        className="w-full rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
      >
        <TrendingUp className="h-4 w-4" />
        Explorar datos
      </button>
    </div>
  );
}
