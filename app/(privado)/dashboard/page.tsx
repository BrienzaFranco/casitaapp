"use client";

import { useMemo } from "react";
import { Download, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearPeso } from "@/lib/formatear";
import { mesClave, fechaLocalISO } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { obtenerMesAnterior } from "@/lib/calculos";
import { GraficoRitmoGasto } from "@/components/dashboard/GraficoRitmoGasto";
import { GraficoAportesMensuales } from "@/components/dashboard/GraficoAportesMensuales";
import { EstadoPresupuestos } from "@/components/dashboard/EstadoPresupuestos";
import { DonutFijosVariables } from "@/components/dashboard/DonutFijosVariables";
import { TreemapSubcategorias } from "@/components/dashboard/TreemapSubcategorias";
import { ChartComparativaPersonal } from "@/components/dashboard/ChartComparativaPersonal";

function formatearMesLabel(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-label text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/70 mb-2">
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);
  const comprasMesAnterior = mesAnterior
    ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior)
    : [];

  const diasEnMes = new Date(
    parseInt(balance.mesSeleccionado.split("-")[0]),
    parseInt(balance.mesSeleccionado.split("-")[1]),
    0,
  ).getDate();

  const promedioDiario = useMemo(() => {
    return diasEnMes > 0 ? balance.resumenMes.total / diasEnMes : 0;
  }, [balance.resumenMes.total, diasEnMes]);

  const mayorCategoria = useMemo(() => {
    if (!balance.categoriasMes.length) return { nombre: "\u2014", pct: 0 };
    const top = balance.categoriasMes[0];
    const pct = balance.resumenMes.total > 0 ? Math.round((top.total / balance.resumenMes.total) * 100) : 0;
    return { nombre: top.categoria.nombre, pct };
  }, [balance.categoriasMes, balance.resumenMes.total]);

  const variacion = balance.variacionMensual;
  const tieneVariacion = variacion.porcentaje !== null && isFinite(variacion.porcentaje);

  function exportar() {
    exportarExcel(balance.comprasMes, balance.resumenMes, balance.resumenHistorico, balance.categoriasMes, balance.etiquetasMes, balance.mesSeleccionado);
    toast.success(`Exportado: ${formatearMesLabel(balance.mesSeleccionado)} (${balance.comprasMes.length} compras)`);
  }

  async function quedarAMano() {
    try {
      const hoy = fechaLocalISO();
      const resumen = balance.saldoAbierto.deudor
        ? `${balance.saldoAbierto.deudor} debia ${formatearPeso(Math.abs(balance.saldoAbierto.balance))} a ${balance.saldoAbierto.acreedor}`
        : "sin deuda";

      await balance.cortes.crearCorte({
        fecha_corte: hoy,
        nota: `Quedaron a mano (${hoy}): ${resumen}. Franco pago ${formatearPeso(balance.saldoAbierto.franco_pago)}, Fabiola pago ${formatearPeso(balance.saldoAbierto.fabiola_pago)}.`,
        hogar_id: balance.compras.compras[0]?.hogar_id ?? null,
        actualizado_por: balance.usuario.perfil?.nombre ?? "Sistema",
      });

      toast.success("Listo: quedaron a mano.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo marcar el corte.";
      toast.error(msg);
    }
  }

  const insights = useMemo(() => {
    const list: Array<{ tipo: "warn" | "good" | "info"; texto: React.ReactNode }> = [];
    const pct = variacion.porcentaje;

    if (pct !== null && pct > 15) {
      list.push({
        tipo: "warn",
        texto: <><strong>{mayorCategoria.nombre} subio {pct}%</strong> vs mes anterior.</>,
      });
    }

    if (pct !== null && pct < -10) {
      list.push({
        tipo: "good",
        texto: <><strong>Bajaron {Math.abs(pct)}%</strong> vs mes anterior. Buen control.</>,
      });
    }

    const conLimite = balance.categoriasMes.filter(c => c.categoria.limite_mensual && c.categoria.limite_mensual > 0);
    const excedidas = conLimite.filter(c => (c.porcentaje ?? 0) > 100);
    if (excedidas.length > 0) {
      list.push({
        tipo: "warn",
        texto: <><strong>{excedidas.length} categoria excedida:</strong> {excedidas.map(c => c.categoria.nombre).join(", ")}.</>,
      });
    }

    const bienPresupuesto = conLimite.filter(c => (c.porcentaje ?? 0) < 60);
    if (bienPresupuesto.length >= 2) {
      list.push({
        tipo: "good",
        texto: <><strong>{bienPresupuesto.length} categorias bajo control</strong> — menos del 60% del limite.</>,
      });
    }

    if (balance.saldoAbierto.deudor) {
      list.push({
        tipo: "info",
        texto: <><strong>Balance pendiente:</strong> {balance.saldoAbierto.deudor} debe {formatearPeso(Math.abs(balance.saldoAbierto.balance))} a {balance.saldoAbierto.acreedor}.</>,
      });
    }

    if (list.length === 0) {
      list.push({
        tipo: "info",
        texto: <><strong>Sin alertas</strong> — todo parece estar en orden este mes.</>,
      });
    }

    return list.slice(0, 3);
  }, [tieneVariacion, variacion, mayorCategoria, balance.categoriasMes, balance.saldoAbierto]);

  const iconMap = { warn: AlertTriangle, good: CheckCircle2, info: Info };
  const colorMap = {
    warn: { bg: "bg-amber-500/10", text: "text-amber-500", icon: "text-amber-500" },
    good: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: "text-emerald-500" },
    info: { bg: "bg-blue-500/10", text: "text-blue-500", icon: "text-blue-500" },
  };

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;
  if (sinCompras) {
    return (
      <section className="space-y-3">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mb-1">Dashboard</p>
          <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">Dashboard de gastos</h2>
          <p className="text-sm text-on-surface-variant mt-1">Sin compras registradas.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70">Metricas</p>
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface mt-0.5">
            {formatearMesLabel(balance.mesSeleccionado)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={balance.mesSeleccionado}
            onChange={(e) => balance.setMesSeleccionado(e.target.value)}
            className="h-8 rounded-lg bg-surface-container-low px-3 font-label text-xs tabular-nums outline-none text-on-surface border border-outline-variant/15"
          />
          <button
            type="button"
            onClick={exportar}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Gasto total */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-3.5">
          <p className="font-label text-[11px] text-on-surface-variant/70 mb-1">Gasto total</p>
          <p className="font-headline text-xl font-semibold tracking-tight text-on-surface tabular-nums">
            {formatearPeso(balance.resumenMes.total)}
          </p>
          {tieneVariacion && (
            <div className="flex items-center gap-1 mt-1.5">
              {variacion.diferencia > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-error" />
              ) : variacion.diferencia < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-success" />
              ) : (
                <Minus className="h-3.5 w-3.5 text-on-surface-variant/50" />
              )}
              <span className={`font-label text-[11px] tabular-nums ${
                variacion.diferencia > 0 ? "text-error" : variacion.diferencia < 0 ? "text-success" : "text-on-surface-variant/60"
              }`}>
                {variacion.diferencia > 0 ? "+" : ""}{variacion.porcentaje !== null ? Math.abs(variacion.porcentaje) : 0}% vs mes ant.
              </span>
            </div>
          )}
        </div>

        {/* Promedio diario */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-3.5">
          <p className="font-label text-[11px] text-on-surface-variant/70 mb-1">Promedio diario</p>
          <p className="font-headline text-xl font-semibold tracking-tight text-on-surface tabular-nums">
            {formatearPeso(Math.round(promedioDiario))}
          </p>
          <p className="font-label text-[11px] text-on-surface-variant/50 mt-1.5">{diasEnMes} dias</p>
        </div>

        {/* Mayor categoria */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-3.5">
          <p className="font-label text-[11px] text-on-surface-variant/70 mb-1">Mayor categoria</p>
          <p className="font-headline text-xl font-semibold tracking-tight text-on-surface">
            {mayorCategoria.nombre}
          </p>
          <p className="font-label text-[11px] tabular-nums text-on-surface-variant/60 mt-1.5">
            {mayorCategoria.pct}% del total
          </p>
        </div>

        {/* Balance pendiente */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-3.5">
          <p className="font-label text-[11px] text-on-surface-variant/70 mb-1">Balance pendiente</p>
          {balance.resumenMes.deudor ? (
            <>
              <p className="font-headline text-lg font-semibold tracking-tight tabular-nums" style={{ color: colorFabi }}>
                {formatearPeso(Math.abs(balance.resumenMes.balance))}
              </p>
              <p className="font-label text-[11px] text-on-surface-variant/60 mt-1">
                {balance.resumenMes.deudor} debe a {balance.resumenMes.acreedor}
              </p>
            </>
          ) : (
            <>
              <p className="font-headline text-lg font-semibold tracking-tight text-success">
                Al dia
              </p>
              <p className="font-label text-[11px] text-on-surface-variant/50 mt-1">Sin deuda</p>
            </>
          )}
        </div>
      </div>

      {/* Balance por usuario */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3.5" style={{ background: `${colorFran}12` }}>
          <p className="font-label text-[11px] font-medium" style={{ color: colorFran }}>{balance.nombres.franco}</p>
          <p className="font-headline text-lg font-semibold tabular-nums mt-0.5" style={{ color: colorFran }}>
            {formatearPeso(balance.resumenMes.franco_pago)}
          </p>
          <p className="font-label text-[10px] text-on-surface-variant/50 mt-0.5">pago este mes</p>
        </div>
        <div className="rounded-xl p-3.5" style={{ background: `${colorFabi}12` }}>
          <p className="font-label text-[11px] font-medium" style={{ color: colorFabi }}>{balance.nombres.fabiola}</p>
          <p className="font-headline text-lg font-semibold tabular-nums mt-0.5" style={{ color: colorFabi }}>
            {formatearPeso(balance.resumenMes.fabiola_pago)}
          </p>
          <p className="font-label text-[10px] text-on-surface-variant/50 mt-0.5">pago este mes</p>
        </div>
      </div>

      {/* Fila 2: Tendencia + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card>
          <SectionTitle>Tendencia de gasto</SectionTitle>
          <GraficoRitmoGasto
            comprasMesActual={balance.comprasMes}
            comprasMesAnterior={comprasMesAnterior}
            mesActual={balance.mesSeleccionado}
            mesAnterior={mesAnterior || "\u2014"}
          />
        </Card>
        <Card>
          <SectionTitle>Fijos vs variables</SectionTitle>
          <DonutFijosVariables
            categoriasMes={balance.categoriasMes}
            colorFijo={colorFran}
            colorVariable={colorFabi}
          />
        </Card>
      </div>

      {/* Fila 3: Aportes mensuales */}
      <GraficoAportesMensuales
        historico={balance.resumenHistorico}
        nombres={balance.nombres}
        colorFran={colorFran}
        colorFabi={colorFabi}
      />

      {/* Fila 4: Presupuestos + Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <Card>
          <SectionTitle>Presupuesto vs real</SectionTitle>
          <EstadoPresupuestos categoriasMes={balance.categoriasMes} />
        </Card>
        <Card>
          <SectionTitle>Top subcategorias</SectionTitle>
          <TreemapSubcategorias categoriasMes={balance.categoriasMes} />
        </Card>
      </div>

      {/* Comparativa personal */}
      <Card>
        <SectionTitle>Comparativa personal</SectionTitle>
        <ChartComparativaPersonal
          comprasMes={balance.comprasMes}
          categorias={balance.categorias.categorias}
          nombres={balance.nombres}
          colorFran={colorFran}
          colorFabi={colorFabi}
        />
      </Card>

      {/* Insights automaticos */}
      <Card>
        <SectionTitle>Insights automaticos</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.tipo];
            const colors = colorMap[insight.tipo];
            return (
              <div key={i} className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${colors.icon}`} />
                </div>
                <p className="font-label text-xs text-on-surface-variant/80 leading-relaxed">
                  {insight.texto}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
