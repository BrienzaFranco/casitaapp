"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearPeso } from "@/lib/formatear";
import { mesClave, fechaLocalISO } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { obtenerMesAnterior } from "@/lib/calculos";
import { ChartCategoriaInteractivo } from "@/components/dashboard/ChartCategoriaInteractivo";
import { ChartEtiquetasInteractivo } from "@/components/dashboard/ChartEtiquetasInteractivo";
import { ChartRitmoGasto } from "@/components/dashboard/ChartRitmoGasto";
import { ChartAportesMensuales } from "@/components/dashboard/ChartAportesMensuales";
import { ChartGastoMensual } from "@/components/dashboard/ChartGastoMensual";
import { ChartDesgloseReparto } from "@/components/dashboard/ChartDesgloseReparto";
import { ChartComparativaPersonal } from "@/components/dashboard/ChartComparativaPersonal";
import { EstadoPresupuestos } from "@/components/dashboard/EstadoPresupuestos";
import { TreemapSubcategorias } from "@/components/dashboard/TreemapSubcategorias";
import { TarjetaSaldoAbierto } from "@/components/dashboard/TarjetaSaldoAbierto";
import { TopDiasGasto } from "@/components/dashboard/TopDiasGasto";
import { HeatmapGasto } from "@/components/dashboard/HeatmapGasto";

function formatearMesLabel(mes: string): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [anio, mesNum] = mes.split("-");
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

/* ── Sparkline KPI Card ── */
function KPICard({
  label,
  value,
  color,
  sparkline,
  sparklineColor,
  subtitle,
  subtitleColor,
  borderTop,
}: {
  label: string;
  value: string;
  color: string;
  sparkline: Array<{ label: string; value: number }>;
  sparklineColor: string;
  subtitle?: string;
  subtitleColor?: string;
  borderTop?: string;
}) {
  const validData = sparkline.length >= 2 && sparkline.some(d => d.value > 0);
  const maxVal = Math.max(...sparkline.map(d => d.value), 1);

  const pathD = validData
    ? sparkline.map((d, i) => {
        const x = (i / (sparkline.length - 1)) * 100;
        const y = 20 - (d.value / maxVal) * 18;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }).join(" ")
    : "";

  const areaD = validData ? `${pathD} L 100 20 L 0 20 Z` : "";

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3" style={borderTop ? { borderTop: `3px solid ${borderTop}` } : {}}>
      <p className="font-label text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color }}>{label}</p>
      <p className="font-label text-lg font-bold tabular-nums" style={{ color }}>{value}</p>

      {validData && (
        <svg viewBox="0 0 100 20" className="h-8 w-full mt-1" preserveAspectRatio="none">
          <path d={areaD} fill={sparklineColor} fillOpacity={0.15} />
          <path d={pathD} fill="none" stroke={sparklineColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {subtitle && (
        <p className="font-label text-[9px] tabular-nums mt-0.5" style={{ color: subtitleColor ?? "var(--on-surface-variant)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── Pagina principal ── */
export default function PaginaDashboard() {
  const balance = usarBalance();
  const config = usarConfiguracion();
  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);
  const comprasMesAnterior = mesAnterior
    ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior)
    : [];

  function exportar() {
    exportarExcel(balance.comprasMes, balance.resumenMes, balance.resumenHistorico, balance.categoriasMes, balance.etiquetasMes, balance.mesSeleccionado);
    toast.success(`Dashboard exportado: ${formatearMesLabel(balance.mesSeleccionado)} (${balance.comprasMes.length} compras)`);
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

  if (balance.compras.cargando || balance.categorias.cargando || balance.usuario.cargando) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </div>
    );
  }

  const sinCompras = !balance.compras.cargando && balance.compras.compras.length === 0;
  if (sinCompras) {
    return (
      <section className="space-y-3">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-5">
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Dashboard</p>
          <h2 className="mt-1 font-headline text-2xl font-semibold tracking-tight text-on-surface">Dashboard de gastos</h2>
          <p className="text-sm text-on-surface-variant">Sin compras registradas.</p>
        </div>
        <article className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-8 text-center">
          <p className="text-on-surface-variant">Registra compras para ver el dashboard.</p>
        </article>
      </section>
    );
  }

  const totalMes = balance.resumenMes.total;
  const francoMes = balance.resumenMes.franco_pago;
  const fabiolaMes = balance.resumenMes.fabiola_pago;
  const variacion = balance.variacionMensual;
  const tieneVariacion = variacion.porcentaje !== null && isFinite(variacion.porcentaje);

  const sparklineData = useMemo(() => {
    const porDia = new Map<string, { total: number; franco: number; fabiola: number }>();
    for (const compra of balance.comprasMes) {
      const entry = porDia.get(compra.fecha) ?? { total: 0, franco: 0, fabiola: 0 };
      for (const item of compra.items) {
        entry.total += item.monto_resuelto;
        entry.franco += item.pago_franco;
        entry.fabiola += item.pago_fabiola;
      }
      porDia.set(compra.fecha, entry);
    }
    return [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([fecha, d]) => ({ fecha: fecha.slice(8), ...d }));
  }, [balance.comprasMes]);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Dashboard</p>
          <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Dashboard de gastos</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={balance.mesSeleccionado}
            onChange={(e) => balance.setMesSeleccionado(e.target.value)}
            className="h-8 rounded bg-surface-container-low border-b border-outline/20 px-2 font-label text-xs tabular-nums outline-none text-on-surface"
          />
          <button
            type="button"
            onClick={exportar}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KPICard
          label="Total mes"
          value={formatearPeso(totalMes)}
          color="var(--primary)"
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.total }))}
          sparklineColor="var(--primary)"
          subtitle={tieneVariacion ? `${variacion.diferencia > 0 ? "↑" : "↓"} ${Math.abs(variacion.porcentaje!)}% vs mes ant.` : undefined}
          subtitleColor={variacion.diferencia > 0 ? "var(--error)" : "var(--success)"}
        />
        <KPICard
          label={balance.nombres.franco}
          value={formatearPeso(francoMes)}
          color={colorFran}
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.franco }))}
          sparklineColor={colorFran}
          subtitle={`${totalMes > 0 ? ((francoMes / totalMes) * 100).toFixed(0) : 0}% del total`}
          borderTop={colorFran}
        />
        <KPICard
          label={balance.nombres.fabiola}
          value={formatearPeso(fabiolaMes)}
          color={colorFabi}
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.fabiola }))}
          sparklineColor={colorFabi}
          subtitle={`${totalMes > 0 ? ((fabiolaMes / totalMes) * 100).toFixed(0) : 0}% del total`}
          borderTop={colorFabi}
        />
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3">
          <p className="font-label text-[9px] uppercase tracking-wider font-bold text-outline mb-1">Balance</p>
          {balance.resumenMes.deudor ? (
            <>
              <p className="font-label text-sm font-bold tabular-nums" style={{ color: colorFabi }}>
                {balance.resumenMes.deudor}
              </p>
              <p className="font-label text-[9px] text-on-surface-variant">
                debe {formatearPeso(Math.abs(balance.resumenMes.balance))} a {balance.resumenMes.acreedor}
              </p>
            </>
          ) : (
            <p className="font-label text-sm font-bold text-success">Al día ✓</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCategoriaInteractivo registros={balance.categoriasMes} comprasMes={balance.comprasMes} />
        <ChartEtiquetasInteractivo registros={balance.etiquetasMes} comprasMes={balance.comprasMes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TarjetaSaldoAbierto
          saldoAbierto={balance.saldoAbierto}
          comprasAbiertas={balance.comprasAbiertas}
          corteActivo={balance.cortes.corteActivo}
          nombres={balance.nombres}
          colorFabi={colorFabi}
          onQuedarAMano={quedarAMano}
          guardando={balance.cortes.guardando}
        />
        <TopDiasGasto diasMasGasto={balance.diasMasGasto} comprasMes={balance.comprasMes} />
      </div>

      <ChartRitmoGasto
        comprasMesActual={balance.comprasMes}
        comprasMesAnterior={comprasMesAnterior}
        mesActual={balance.mesSeleccionado}
        mesAnterior={mesAnterior || "—"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeatmapGasto tendenciaDiariaMes={balance.tendenciaDiariaMes} mesLabel={formatearMesLabel(balance.mesSeleccionado)} />
        <ChartDesgloseReparto comprasMes={balance.comprasMes} nombres={balance.nombres} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartAportesMensuales
          historico={balance.resumenHistorico}
          nombres={balance.nombres}
          colorFran={colorFran}
          colorFabi={colorFabi}
        />
        <EstadoPresupuestos categoriasMes={balance.categoriasMes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartComparativaPersonal
          comprasMes={balance.comprasMes}
          categorias={balance.categorias.categorias}
          nombres={balance.nombres}
          colorFran={colorFran}
          colorFabi={colorFabi}
        />
        <TreemapSubcategorias categoriasMes={balance.categoriasMes} />
      </div>

      <ChartGastoMensual compras={balance.compras.compras} />
    </section>
  );
}
