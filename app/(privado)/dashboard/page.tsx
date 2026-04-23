"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearPeso, formatearPorcentaje } from "@/lib/formatear";
import { mesClave, fechaLocalISO } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { obtenerMesAnterior } from "@/lib/calculos";
import type { CategoriaBalance } from "@/types";

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
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import { DeltaBadge } from "@/components/dashboard/DeltaBadge";
import { GraficoDiarioComparativo } from "@/components/dashboard/GraficoDiarioComparativo";
import { DrawerCategoria } from "@/components/dashboard/DrawerCategoria";
import { DistribucionPersona } from "@/components/dashboard/DistribucionPersona";
import { TopGastosMes } from "@/components/dashboard/TopGastosMes";
import { generarInsights } from "@/lib/insights";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatearMesLabel(mes: string): string {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

function formatearMesCorto(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const router = useRouter();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const [filtro, setFiltro] = useState<FiltroActivo>({ personas: [], categorias: [], etiquetas: [], subcategorias: [] });
  const [periodo, setPeriodo] = useState<PeriodoActivo>({ tipo: "este-mes", label: "Este mes" });
  const [categoriaDrawer, setCategoriaDrawer] = useState<CategoriaBalance["categoria"] | null>(null);
  const [diaFiltro, setDiaFiltro] = useState<number | null>(null);

  function handlePersonaClick(persona: "franco" | "fabiola" | "todos") {
    if (persona === "todos") {
      setFiltro((prev) => ({ ...prev, personas: [] }));
    } else {
      setFiltro((prev) => ({
        ...prev,
        personas: prev.personas.includes(persona) ? [] : [persona],
      }));
    }
  }

  function handleDiaClick(dia: number) {
    setDiaFiltro((prev) => (prev === dia ? null : dia));
  }

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

  const promedioDiario = diasEnMes > 0 ? totalGastado / diasEnMes : 0;

  const totalMesAnterior = montoFiltrado(comprasMesAnteriorData, filtro);
  const diasEnMesAnterior = mesAnterior
    ? new Date(parseInt(mesAnterior.split("-")[0]), parseInt(mesAnterior.split("-")[1]), 0).getDate()
    : diasEnMes;
  const promedioDiarioAnterior = diasEnMesAnterior > 0 ? totalMesAnterior / diasEnMesAnterior : 0;
  const variacionDiaria = promedioDiarioAnterior > 0
    ? ((promedioDiario - promedioDiarioAnterior) / promedioDiarioAnterior) * 100
    : 0;

  const factorProyeccion = diaDelMes > 0 ? diasEnMes / diaDelMes : 1;
  const proyeccionFinMes = Math.round(totalGastado * factorProyeccion * 100) / 100;
  const diffProyeccion = proyeccionFinMes - presupuestoTotal;

  const numBorradores = balance.compras.compras.filter((c) => c.estado === "borrador").length;
  const totalBorradores = balance.compras.compras
    .filter((c) => c.estado === "borrador")
    .reduce((acc, c) => acc + c.items.reduce((a, i) => a + i.monto_resuelto, 0), 0);

  const categoriasConLimite = useMemo(() => {
    const conLimite = balance.categoriasMes.filter(
      (c) => c.categoria.limite_mensual && c.categoria.limite_mensual > 0,
    );
    const ordenPrioridad = (cat: CategoriaBalance) => {
      const pct = cat.porcentaje ?? 0;
      if (pct > 100) return 0;
      if (pct >= 80) return 1;
      if (cat.es_fijo) return 4;
      return 2;
    };
    return [...conLimite].sort((a, b) => {
      const oa = ordenPrioridad(a);
      const ob = ordenPrioridad(b);
      if (oa !== ob) return oa - ob;
      return (b.porcentaje ?? 0) - (a.porcentaje ?? 0);
    });
  }, [balance.categoriasMes]);

  const categoriasSinLimite = useMemo(() => {
    return balance.categoriasMes.filter(
      (c) => (!c.categoria.limite_mensual || c.categoria.limite_mensual <= 0) && c.total > 0,
    );
  }, [balance.categoriasMes]);

  const comprasMesParaGrafico = useMemo(() => {
    if (!diaFiltro) return comprasPeriodo;
    return comprasPeriodo.filter((c) => new Date(`${c.fecha}T00:00:00`).getDate() === diaFiltro);
  }, [comprasPeriodo, diaFiltro]);

  const comprasMesAnteriorParaGrafico = useMemo(() => {
    if (!diaFiltro) return comprasMesAnteriorData;
    return comprasMesAnteriorData.filter((c) => new Date(`${c.fecha}T00:00:00`).getDate() === diaFiltro);
  }, [comprasMesAnteriorData, diaFiltro]);

  const insights = useMemo(() => generarInsights({
    categoriasConLimite,
    totalGastado,
    presupuestoTotal,
    diffProyeccion,
    proyeccionFinMes,
    variacionDiaria,
    mesAnteriorKey: balance.mesSeleccionado,
    totalMesAnterior,
    deudor: balance.saldoAbierto.deudor,
    acreedor: balance.saldoAbierto.acreedor,
    saldoAbiertoBalance: balance.saldoAbierto.balance,
    numBorradores,
    totalBorradores,
    comprasMes: comprasPeriodo,
    resumenHistorico: balance.resumenHistorico,
    diasDelMes: diasEnMes,
    diaDelMes,
  }), [categoriasConLimite, totalGastado, presupuestoTotal, diffProyeccion, proyeccionFinMes, variacionDiaria, balance.mesSeleccionado, totalMesAnterior, balance.saldoAbierto, numBorradores, totalBorradores, comprasPeriodo, balance.resumenHistorico, diasEnMes, diaDelMes]);

  const insightsVisibles = insights.slice(0, 3);
  const insightsOcultos = insights.slice(3);

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
      <div className="space-y-3 px-4 pt-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;
  if (sinCompras) {
    return (
      <section className="px-4 pt-4">
        <div className="rounded-xl border border-outline-variant/10 p-5 bg-surface-container-lowest">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mb-1">Dashboard</p>
          <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface mt-0.5">Sin compras registradas</h2>
          <p className="text-sm text-on-surface-variant mt-1">Agrega tu primera compra para ver las metricas aqui.</p>
        </div>
      </section>
    );
  }

  const heroBadgeClass = pctUsado > 100 ? "bg-[#FCEBEB] text-[#791F1F]" : pctUsado > 75 ? "bg-[#FAEEDA] text-[#633806]" : "bg-[#EAF3DE] text-[#173404]";
  const heroBarColor = pctUsado > 100 ? "#E24B4A" : pctUsado > 75 ? "#EF9F27" : "#1D9E75";

  const insightIconMap: Record<string, string> = { warning: "⚠", positive: "✓", info: "→", anomaly: "📌" };
  const insightBgMap: Record<string, string> = {
    warning: "bg-[#FCEBEB] text-[#791F1F]",
    positive: "bg-[#EAF3DE] text-[#173404]",
    info: "bg-[#E6F1FB] text-[#042C53]",
    anomaly: "bg-[#FAEEDA] text-[#633806]",
  };

  return (
    <div className="max-w-[430px] mx-auto pb-10" style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          mesActualLabel={formatearMesLabel(balance.mesSeleccionado)}
          mesAnteriorLabel={mesAnteriorLabel}
        />
        <div className="flex gap-1.5">
          <button type="button" onClick={exportar} className="w-[34px] h-[34px] rounded-[10px] border-[0.5px] border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors" title="Exportar Excel">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v9M4 7l3.5 3.5L11 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 11v1.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
          <button type="button" onClick={() => router.push("/nueva-compra")} className="w-[34px] h-[34px] rounded-[10px] border-[0.5px] border-outline-variant/20 bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors" title="Nueva compra">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* ── FILTROS ── */}
      <FiltroGlobal
        filtro={filtro}
        setFiltro={(f) => { setFiltro(f); setDiaFiltro(null); }}
        categorias={balance.categorias.categorias}
        etiquetas={balance.categorias.etiquetas}
        subcategorias={balance.categorias.subcategorias}
      />

      {/* ── HERO ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-3 mb-2">
        gasto del período
      </p>
      <div className="mx-4 rounded-[18px] overflow-hidden bg-surface-container-lowest border-[0.5px] border-outline-variant/10">
        <div className="px-5 py-5 pb-3">
          <p className="text-[10px] font-medium uppercase tracking-[.08em] text-on-surface-variant/50 mb-1">
            total gastado
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
            <div className="mt-2 space-y-1">
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
              {proyeccionFinMes > 0 && (
                <p className="text-[11px] text-on-surface-variant/50">
                  Proyección fin de mes: <strong className={`font-medium ${diffProyeccion > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>
                    {formatearPeso(proyeccionFinMes)}
                  </strong>
                  {presupuestoTotal > 0 && (
                    <span className={diffProyeccion > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>
                      {" "}({diffProyeccion > 0 ? "+" : ""}{formatearPeso(diffProyeccion)} vs presupuesto)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {presupuestoTotal > 0 && (
          <>
            <div className="h-[10px] bg-surface-container-low relative overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${Math.min(pctUsado, 100)}%`, background: heroBarColor }} />
              <div className="absolute top-0 bottom-0 w-[1.5px] bg-outline-variant/30" style={{ left: "100%" }} />
            </div>
            <div className="flex justify-between px-5 pb-3 pt-1 text-[10px] text-on-surface-variant/40">
              <span>$0</span>
              <span>{formatearPeso(presupuestoTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── KPIs ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        métricas
      </p>
      <KPIStrip
        comprasMes={comprasPeriodo}
        filtro={filtro}
        presupuestoTotal={presupuestoTotal}
        diasRestantes={diasRestantes}
        diasEnMes={diasEnMes}
        diaDelMes={diaDelMes}
        totalMesAnterior={totalMesAnterior}
        diasEnMesAnterior={diasEnMesAnterior}
        proyeccionFinMes={proyeccionFinMes}
        numBorradores={numBorradores}
        totalBorradores={totalBorradores}
        onPersonaClick={handlePersonaClick}
        onBorradoresClick={() => router.push("/borradores")}
        colorFran={colorFran}
        colorFabi={colorFabi}
      />

      {/* ── GRÁFICO DIARIO ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        ritmo diario
      </p>
      <GraficoDiarioComparativo
        comprasMes={comprasMesParaGrafico}
        comprasMesAnterior={comprasMesAnteriorParaGrafico}
        filtro={filtro}
        promedioDiario={promedioDiario}
        onDiaClick={handleDiaClick}
        colorActual={colorFran}
        colorAnterior={colorFabi}
      />

      {/* ── DISTRIBUCIÓN ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        quién pagó qué
      </p>
      <DistribucionPersona
        comprasMes={comprasPeriodo}
        filtro={filtro}
        resumenMes={balance.resumenMes}
        colorFran={colorFran}
        colorFabi={colorFabi}
        onPersonaClick={handlePersonaClick}
      />

      {/* ── CATEGORÍAS ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        límites por categoría
      </p>
      <div className="px-4">
        {categoriasConLimite.map((cat) => {
          const limite = Number(cat.categoria.limite_mensual);
          const pct = cat.porcentaje ?? 0;
          const restanteCat = limite - cat.total;
          const excedido = pct > 100;
          const casiLimite = pct >= 80 && pct <= 100;
          const esFijo = cat.es_fijo;
          const pagadoFijo = esFijo && cat.total >= limite && pct <= 105;

          let cardClass = "bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-4 py-3 mb-1.5 cursor-pointer transition-colors hover:border-outline-variant/20";
          if (excedido) cardClass += " border-[#F09595] bg-[#FCEBEB]/40";
          if (casiLimite && !excedido) cardClass += " border-l-[3px] border-l-[#EF9F27]";
          if (esFijo && !excedido) cardClass += " opacity-80";

          let barColor = "#1D9E75";
          if (excedido) barColor = "#E24B4A";
          else if (casiLimite) barColor = "#EF9F27";
          if (pagadoFijo) barColor = "#7F77DD";

          let remColor = "#0F6E56";
          if (excedido) remColor = "#A32D2D";
          else if (casiLimite) remColor = "#854F0B";
          if (pagadoFijo) remColor = "#534AB7";

          return (
            <div key={cat.categoria.id} className={cardClass} onClick={() => setCategoriaDrawer(cat.categoria)}>
              <div className="flex items-center justify-between mb-[7px]">
                <div className="flex items-center gap-2">
                  <div className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: cat.categoria.color }} />
                  <span className="text-[13px] font-medium text-on-surface">{cat.categoria.nombre}</span>
                  {esFijo && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/50 font-medium">FIJO</span>}
                </div>
                <div className="text-right">
                  {excedido ? (
                    <div className="text-[13px] font-medium text-[#A32D2D]">–{formatearPeso(Math.abs(restanteCat))} excedido</div>
                  ) : pagadoFijo ? (
                    <div className="text-[13px] font-medium text-[#534AB7]">Pagado ✓</div>
                  ) : (
                    <div className="text-[13px] font-medium" style={{ color: remColor }}>{formatearPeso(restanteCat)} restante</div>
                  )}
                  <div className="text-[10px] text-on-surface-variant/40 mt-0.5">{formatearPeso(cat.total)} de {formatearPeso(limite)}</div>
                </div>
              </div>
              <div className="h-[5px] bg-surface-container-low rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-400" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-on-surface-variant/40">
                <span>{formatearPorcentaje(Math.round(pct))} del limite</span>
                <span>{excedido ? "Excediste el limite" : casiLimite ? "Casi al limite" : ""}</span>
              </div>
            </div>
          );
        })}

        {categoriasSinLimite.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] text-on-surface-variant/40 mb-1 pl-0.5">sin limite configurado</p>
            {categoriasSinLimite.map((cat) => (
              <div
                key={cat.categoria.id}
                className="flex items-center justify-between px-2.5 py-[7px] bg-surface-container-low rounded-[10px] mb-1 cursor-pointer hover:bg-surface-container"
                onClick={() => setCategoriaDrawer(cat.categoria)}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: cat.categoria.color }} />
                  <span className="text-[12px] text-on-surface-variant/70">{cat.categoria.nombre}</span>
                </div>
                <span className="text-[12px] font-medium text-on-surface">{formatearPeso(cat.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ETIQUETAS DEL MES ── */}
      {balance.etiquetasMes.length > 0 && (
        <>
          <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
            etiquetas del mes
          </p>
          <div className="px-4">
            {balance.etiquetasMes.map((et) => (
              <div key={et.etiqueta.id} className="flex items-center justify-between px-2.5 py-[7px] bg-surface-container-low rounded-[10px] mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-[9px] h-[9px] rounded-full shrink-0" style={{ backgroundColor: et.etiqueta.color }} />
                  <span className="text-[12px] text-on-surface-variant/70">{et.etiqueta.nombre}</span>
                  <span className="text-[10px] text-on-surface-variant/40">({et.cantidad_items})</span>
                </div>
                <span className="text-[12px] font-medium text-on-surface">{formatearPeso(et.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TOP GASTOS ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        ranking de gastos
      </p>
      <div className="mx-4">
        <TopGastosMes comprasMes={comprasPeriodo} filtro={filtro} />
      </div>

      {/* ── BALANCE ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        balance entre los dos
      </p>
      <div className="mx-4 bg-surface-container-lowest border-[0.5px] border-outline-variant/10 rounded-[14px] px-4 py-3 flex items-center justify-between gap-2.5">
        <div className="flex">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-surface-container-lowest shrink-0" style={{ backgroundColor: hexToRgba(colorFran, 0.15), color: colorFran, zIndex: 1 }}>
            {balance.nombres.franco.slice(0, 3)}
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-surface-container-lowest shrink-0 -ml-[7px]" style={{ backgroundColor: hexToRgba(colorFabi, 0.15), color: colorFabi }}>
            {balance.nombres.fabiola.slice(0, 3)}
          </div>
        </div>

        {balance.resumenMes.deudor ? (
          <div className="flex-1 text-[12px] text-on-surface-variant/70">
            <strong className="text-on-surface font-medium">{balance.resumenMes.deudor}</strong> le debe a{" "}
            <strong className="text-on-surface font-medium">{balance.resumenMes.acreedor}</strong>
          </div>
        ) : (
          <div className="flex-1 text-[12px] text-on-surface-variant/70">Al dia, <strong className="text-on-surface font-medium">sin deuda</strong></div>
        )}

        {balance.resumenMes.deudor ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[15px] font-medium text-[#A32D2D]">{formatearPeso(Math.abs(balance.resumenMes.balance))}</span>
            <button type="button" onClick={saldarBalance} className="text-[11px] px-2.5 py-1 rounded-full border-[0.5px] border-outline-variant/20 bg-transparent text-on-surface-variant/70 hover:bg-surface-container-low transition-colors whitespace-nowrap">Saldar</button>
          </div>
        ) : (
          <div className="text-[15px] font-medium text-[#0F6E56] shrink-0">Al dia ✓</div>
        )}
      </div>

      {/* ── INSIGHTS ── */}
      <p className="text-[10px] font-medium uppercase tracking-[.09em] text-on-surface-variant/50 px-4 mt-5 mb-2">
        insights
      </p>
      <div className="px-4 flex flex-col gap-1.5">
        {insightsVisibles.map((insight, i) => (
          <div key={i} className={`rounded-[11px] px-2.5 py-2 text-[12px] flex items-start gap-2 leading-[1.45] ${insightBgMap[insight.tipo]}`}>
            <span className="text-[13px] shrink-0 mt-px">{insightIconMap[insight.tipo]}</span>
            <div className="flex-1">
              <strong>{insight.titulo}</strong>
              <span className="ml-1">{insight.detalle}</span>
              {insight.accion && (
                <button
                  type="button"
                  onClick={insight.accion.onClick}
                  className="ml-1.5 underline opacity-70 hover:opacity-100 transition-opacity"
                >
                  {insight.accion.label}
                </button>
              )}
            </div>
          </div>
        ))}
        {insightsOcultos.length > 0 && (
          <details className="group">
            <summary className="text-[11px] text-on-surface-variant/50 cursor-pointer py-1 hover:text-on-surface-variant/70">
              Ver {insightsOcultos.length} más
            </summary>
            <div className="flex flex-col gap-1.5 mt-1">
              {insightsOcultos.map((insight, i) => (
                <div key={i} className={`rounded-[11px] px-2.5 py-2 text-[12px] flex items-start gap-2 leading-[1.45] ${insightBgMap[insight.tipo]}`}>
                  <span className="text-[13px] shrink-0 mt-px">{insightIconMap[insight.tipo]}</span>
                  <div>
                    <strong>{insight.titulo}</strong>
                    <span className="ml-1">{insight.detalle}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ── EXPLORAR ── */}
      <div className="px-4 mt-5">
        <button
          type="button"
          onClick={() => router.push("/dashboard/explorar")}
          className="w-full rounded-[14px] border-[0.5px] border-outline-variant/20 bg-surface-container-low px-4 py-3 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V6l4-4 4 4v8M10 14V8l4-4v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Explorar datos
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-outline-variant/10 mx-4 mt-5" />

      {/* ── CATEGORY DRAWER ── */}
      {categoriaDrawer && (
        <DrawerCategoria
          categoria={categoriaDrawer}
          comprasMes={comprasPeriodo}
          comprasMesAnterior={comprasMesAnteriorData}
          comprasHistorico={balance.compras.compras}
          filtro={filtro}
          onClose={() => setCategoriaDrawer(null)}
        />
      )}
    </div>
  );
}
