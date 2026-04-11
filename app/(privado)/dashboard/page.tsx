"use client";

import { useMemo, useState } from "react";
import { Calendar, X, Tag, PieChart, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import type { Categoria, CategoriaBalance, Compra, EtiquetaBalance } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { exportarExcel } from "@/lib/exportar";
import { usarBalance } from "@/hooks/usarBalance";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { obtenerMesAnterior } from "@/lib/calculos";
import { fechaLocalISO } from "@/lib/utiles";
import { GraficoRitmoGasto } from "@/components/dashboard/GraficoRitmoGasto";
import { GraficoAportesMensuales } from "@/components/dashboard/GraficoAportesMensuales";
import { EstadoPresupuestos } from "@/components/dashboard/EstadoPresupuestos";
import { TreemapSubcategorias } from "@/components/dashboard/TreemapSubcategorias";
import { TarjetaSaldoAbierto } from "@/components/dashboard/TarjetaSaldoAbierto";
import { TopDiasGasto } from "@/components/dashboard/TopDiasGasto";
import { DesgloseReparto } from "@/components/dashboard/DesgloseReparto";
import { ComparativaPersonal } from "@/components/dashboard/ComparativaPersonal";
import { HeatmapGasto } from "@/components/dashboard/HeatmapGasto";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ── Helpers ── */
function formatearMesLabel(mes: string): string {
  const [anio, mesNum] = mes.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[parseInt(mesNum, 10) - 1]} ${anio}`;
}

/* ── Modal de expenses ── */
function ModalExpenses({
  titulo,
  compras,
  onClose,
}: {
  titulo: string;
  compras: Compra[];
  onClose: () => void;
}) {
  const total = compras.reduce((a, c) => a + c.items.reduce((b, i) => b + i.monto_resuelto, 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
      <div className="bg-surface-container-lowest w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-outline">Detalle</p>
            <p className="font-headline text-sm font-semibold text-on-surface">{titulo}</p>
            <p className="font-label text-xs text-on-surface-variant">{compras.length} compras · {formatearPeso(total)}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {compras.map(compra => (
            <div key={compra.id} className="px-2 py-2 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-headline text-xs font-semibold text-on-surface truncate">
                    {compra.nombre_lugar || "Sin lugar"}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {formatearFecha(compra.fecha)} · {compra.pagador_general === "franco" ? "Franco" : compra.pagador_general === "fabiola" ? "Fabiola" : "Ambos"}
                  </p>
                </div>
                <span className="font-label text-xs font-bold tabular-nums text-on-surface shrink-0 ml-2">
                  {formatearPeso(compra.items.reduce((a, i) => a + i.monto_resuelto, 0))}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5">
                {compra.items.map(item => (
                  <p key={item.id} className="font-label text-[9px] text-on-surface-variant pl-2">
                    {item.descripcion || "Sin detalle"} — {formatearPeso(item.monto_resuelto)}
                    {item.categoria && <span className="ml-1">({item.categoria.nombre})</span>}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Chart wrappers with modal interaction ── */
function GraficoCategoriaInteractivo({
  registros,
  comprasMes,
}: {
  registros: CategoriaBalance[];
  comprasMes: Compra[];
}) {
  const [idxActivo, setIdxActivo] = useState(0);
  const [modalCat, setModalCat] = useState<Categoria | null>(null);

  const datos = useMemo(
    () =>
      registros.map((r) => ({
        id: r.categoria.id,
        nombre: r.categoria.nombre,
        color: r.categoria.color || "#6b7280",
        total: r.total,
        pct: registros.reduce((a, x) => a + x.total, 0) > 0 ? (r.total / registros.reduce((a, x) => a + x.total, 0)) * 100 : 0,
      })),
    [registros],
  );

  const totalGeneral = registros.reduce((acc, r) => acc + r.total, 0);
  const activo = datos[idxActivo] ?? null;

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hay categorias con gasto para graficar.</p>
      </section>
    );
  }

  const comprasDeCategoria = modalCat
    ? comprasMes.filter(c => c.items.some(i => i.categoria_id === modalCat.id))
    : null;

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Distribucion por categoria
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Toca un segmento para ver las compras</p>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <ResponsiveContainer width="99%" minHeight={192}>
              <RePieChart>
                <Pie
                  data={datos}
                  dataKey="total"
                  nameKey="nombre"
                  innerRadius={52}
                  outerRadius={78}
                  onMouseEnter={(_, i) => setIdxActivo(i)}
                  onClick={(_, i) => {
                    setIdxActivo(i);
                    const cat = registros.find(r => r.categoria.id === datos[i]?.id);
                    if (cat) setModalCat(cat.categoria);
                  }}
                >
                  {datos.map((d, i) => (
                    <Cell
                      key={d.id}
                      fill={d.color}
                      fillOpacity={i === idxActivo ? 1 : 0.5}
                      stroke={i === idxActivo ? "var(--outline-variant)" : "transparent"}
                      strokeWidth={i === idxActivo ? 1.5 : 0}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatearPeso(Number(v ?? 0))}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    borderColor: "var(--outline-variant)",
                    backgroundColor: "var(--surface-container-lowest)",
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                {activo?.nombre ?? "Sin datos"}
              </p>
              <p className="font-label text-lg font-bold tabular-nums text-primary mt-0.5">
                {activo ? formatearPeso(activo.total) : formatearPeso(0)}
              </p>
              <p className="font-label text-[10px] text-on-surface-variant">
                {activo ? `${activo.pct.toFixed(0)}%` : "0%"}
              </p>
            </div>
          </div>

          <div className="space-y-0 divide-y divide-outline-variant/10">
            {datos.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setIdxActivo(i);
                  const cat = registros.find(r => r.categoria.id === d.id);
                  if (cat) setModalCat(cat.categoria);
                }}
                className={`w-full flex items-center justify-between py-2 transition-colors duration-150 ${
                  i === idxActivo ? "bg-surface-container-high" : "bg-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
                </div>
                <div className="text-right">
                  <p className="font-label text-xs font-bold tabular-nums text-on-surface">
                    {formatearPeso(d.total)}
                  </p>
                  <p className="font-label text-[10px] text-on-surface-variant">
                    {d.pct.toFixed(0)}%
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {comprasDeCategoria && modalCat && (
        <ModalExpenses
          titulo={`Categoria: ${modalCat.nombre}`}
          compras={comprasDeCategoria}
          onClose={() => setModalCat(null)}
        />
      )}
    </>
  );
}

function GraficoEtiquetasInteractivo({
  registros,
  comprasMes,
}: {
  registros: EtiquetaBalance[];
  comprasMes: Compra[];
}) {
  const [modalEtiqueta, setModalEtiqueta] = useState<string | null>(null);

  const datos = useMemo(
    () =>
      registros.map((r) => ({
        id: r.etiqueta.id,
        nombre: r.etiqueta.nombre,
        color: r.etiqueta.color || "#6b7280",
        total: r.total,
        cantidad_items: r.cantidad_items,
      })),
    [registros],
  );

  if (!datos.length) {
    return (
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 shadow-sm">
        <p className="font-label text-xs text-on-surface-variant">No hubo etiquetas usadas este mes.</p>
      </section>
    );
  }

  const comprasDeEtiqueta = modalEtiqueta
    ? comprasMes.filter(c => c.items.some(i => i.etiquetas.some(e => e.id === modalEtiqueta)))
    : null;

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Gastos por etiqueta
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Toca una barra para ver las compras</p>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="99%" minHeight={192}>
              <BarChart data={datos} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
                <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => formatearPeso(Number(v))}
                />
                <Tooltip
                  formatter={(v) => formatearPeso(Number(v ?? 0))}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    borderColor: "var(--outline-variant)",
                    backgroundColor: "var(--surface-container-lowest)",
                  }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {datos.map((d) => (
                    <Cell key={d.id} fill={d.color} style={{ cursor: "pointer" }} onClick={() => setModalEtiqueta(d.id)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

          <div className="mt-3 space-y-0 divide-y divide-outline-variant/10">
            {datos.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setModalEtiqueta(d.id)}
                className="w-full flex items-center justify-between py-2 hover:bg-surface-container-high rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-label text-xs font-medium text-on-surface">{d.nombre}</span>
                  <span className="font-label text-[10px] text-on-surface-variant">{d.cantidad_items} items</span>
                </div>
                <span className="font-label text-sm font-bold tabular-nums text-on-surface">
                  {formatearPeso(d.total)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {comprasDeEtiqueta && (
        <ModalExpenses
          titulo={`Etiqueta: ${datos.find(d => d.id === modalEtiqueta)?.nombre ?? ""}`}
          compras={comprasDeEtiqueta}
          onClose={() => setModalEtiqueta(null)}
        />
      )}
    </>
  );
}

function GraficoMensual({ compras }: { compras: Compra[] }) {
  const [modalMes, setModalMes] = useState<string | null>(null);

  const porMes = useMemo(() => {
    const mapa = new Map<string, { total: number; compras: Compra[] }>();
    for (const compra of compras) {
      if (compra.estado === "borrador") continue;
      const clave = mesClave(compra.fecha);
      const actual = mapa.get(clave) ?? { total: 0, compras: [] };
      actual.total += compra.items.reduce((a, i) => a + i.monto_resuelto, 0);
      actual.compras.push(compra);
      mapa.set(clave, actual);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mes, data]) => ({ mes, ...data }));
  }, [compras]);

  if (!porMes.length) {
    return null;
  }

  const comprasDelMes = modalMes ? (porMes.find(p => p.mes === modalMes)?.compras ?? []) : null;

  return (
    <>
      <section className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container-high">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
              Gasto mensual
            </h2>
          </div>
          <p className="font-label text-[10px] text-on-surface-variant">Ultimos 12 meses · toca una barra para ver compras</p>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="99%" minHeight={224}>
              <BarChart data={porMes} margin={{ top: 4, right: 4, left: -8, bottom: 4 }}>
                <XAxis
                  dataKey="mes"
                  tick={({ x, y, payload }) => (
                    <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={9} fill="var(--on-surface-variant)">
                      {formatearMesLabel(payload.value)}
                    </text>
                  )}
                  tickLine={false}
                  axisLine={false}
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--on-surface-variant)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => formatearPeso(Number(v))}
                />
                <Tooltip
                  formatter={(v) => formatearPeso(Number(v ?? 0))}
                  labelFormatter={(label) => formatearMesLabel(String(label))}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    borderColor: "var(--outline-variant)",
                    backgroundColor: "var(--surface-container-lowest)",
                  }}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]}>
                  {porMes.map((d, i) => (
                    <Cell key={d.mes} fill={i === porMes.length - 1 ? "var(--secondary)" : "var(--primary)"} style={{ cursor: "pointer" }} onClick={() => setModalMes(d.mes)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </div>
      </section>

      {comprasDelMes && modalMes && (
        <ModalExpenses
          titulo={`Mes: ${formatearMesLabel(modalMes)}`}
          compras={comprasDelMes}
          onClose={() => setModalMes(null)}
        />
      )}
    </>
  );
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
  const hasData = sparkline.some(d => d.value > 0);

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3" style={borderTop ? { borderTop: `3px solid ${borderTop}` } : {}}>
      <p className="font-label text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color }}>{label}</p>
      <p className="font-label text-lg font-bold tabular-nums" style={{ color }}>{value}</p>

      {/* Sparkline */}
      {hasData && (
        <div className="h-8 mt-1 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparklineColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s/g, "")})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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

  // Get previous month's purchases for burn rate chart
  const mesAnterior = obtenerMesAnterior(balance.mesSeleccionado);
  const comprasMesAnterior = mesAnterior
    ? balance.compras.compras.filter((c) => mesClave(c.fecha) === mesAnterior)
    : [];

  function exportar() {
    exportarExcel(balance.comprasMes, balance.resumenMes, balance.resumenHistorico, balance.categoriasMes, balance.etiquetasMes, balance.mesSeleccionado);
    toast.success(`Dashboard exportado: ${formatearMesLabel(balance.mesSeleccionado)} (${balance.comprasMes.length} compras)`);
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

  // KPI values
  const totalMes = balance.resumenMes.total;
  const francoMes = balance.resumenMes.franco_pago;
  const fabiolaMes = balance.resumenMes.fabiola_pago;
  const variacion = balance.variacionMensual;
  const tieneVariacion = variacion.porcentaje !== null && isFinite(variacion.porcentaje);

  // Sparkline data: last 7 days of spending
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

  return (
    <section className="space-y-4">
      {/* Header with month picker + export */}
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
        {/* Total */}
        <KPICard
          label="Total mes"
          value={formatearPeso(totalMes)}
          color="var(--primary)"
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.total }))}
          sparklineColor="var(--primary)"
          subtitle={tieneVariacion ? `${variacion.diferencia > 0 ? "↑" : "↓"} ${Math.abs(variacion.porcentaje!)}% vs mes ant.` : undefined}
          subtitleColor={variacion.diferencia > 0 ? "var(--error)" : "var(--success)"}
        />
        {/* Franco */}
        <KPICard
          label={balance.nombres.franco}
          value={formatearPeso(francoMes)}
          color={colorFran}
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.franco }))}
          sparklineColor={colorFran}
          subtitle={`${totalMes > 0 ? ((francoMes / totalMes) * 100).toFixed(0) : 0}% del total`}
          borderTop={colorFran}
        />
        {/* Fabiola */}
        <KPICard
          label={balance.nombres.fabiola}
          value={formatearPeso(fabiolaMes)}
          color={colorFabi}
          sparkline={sparklineData.map(d => ({ label: d.fecha, value: d.fabiola }))}
          sparklineColor={colorFabi}
          subtitle={`${totalMes > 0 ? ((fabiolaMes / totalMes) * 100).toFixed(0) : 0}% del total`}
          borderTop={colorFabi}
        />
        {/* Balance */}
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

      {/* Row 1: Category donut + Labels bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoCategoriaInteractivo registros={balance.categoriasMes} comprasMes={balance.comprasMes} />
        <GraficoEtiquetasInteractivo registros={balance.etiquetasMes} comprasMes={balance.comprasMes} />
      </div>

      {/* Row 2: Open balance card + Top spending days */}
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

      {/* Row 3: Burn rate chart */}
      <GraficoRitmoGasto
        comprasMesActual={balance.comprasMes}
        comprasMesAnterior={comprasMesAnterior}
        mesActual={balance.mesSeleccionado}
        mesAnterior={mesAnterior || "—"}
      />

      {/* Row 4: Heatmap + Reparto breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HeatmapGasto tendenciaDiariaMes={balance.tendenciaDiariaMes} mesLabel={formatearMesLabel(balance.mesSeleccionado)} />
        <DesgloseReparto comprasMes={balance.comprasMes} nombres={balance.nombres} />
      </div>

      {/* Row 5: Monthly contributions + Budget progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoAportesMensuales
          historico={balance.resumenHistorico}
          nombres={balance.nombres}
          colorFran={colorFran}
          colorFabi={colorFabi}
        />
        <EstadoPresupuestos categoriasMes={balance.categoriasMes} />
      </div>

      {/* Row 6: Personal comparison + Treemap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparativaPersonal
          comprasMes={balance.comprasMes}
          categorias={balance.categorias.categorias}
          nombres={balance.nombres}
          colorFran={colorFran}
          colorFabi={colorFabi}
        />
        <TreemapSubcategorias categoriasMes={balance.categoriasMes} />
      </div>

      {/* Row 7: Monthly bar chart */}
      <GraficoMensual compras={balance.compras.compras} />
    </section>
  );
}
