"use client";

import { useMemo, useState } from "react";
import { Calendar, X, Tag, PieChart, TrendingUp } from "lucide-react";
import type { Categoria, CategoriaBalance, Compra, EtiquetaBalance } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatearFecha, formatearPeso } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { usarBalance } from "@/hooks/usarBalance";
import {
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
          <div className="relative" style={{ minHeight: "192px" }}>
            <ResponsiveContainer width="100%" height="100%">
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
          <div className="w-full" style={{ minHeight: "192px" }}>
            <ResponsiveContainer width="100%" height="100%">
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
          </div>

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
          <div className="w-full" style={{ minHeight: "224px" }}>
            <ResponsiveContainer width="100%" height="100%">
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

/* ── Pagina principal ── */
export default function PaginaDashboard() {
  const balance = usarBalance();

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

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline">Dashboard</p>
          <h2 className="font-headline text-xl font-bold tracking-tight text-on-surface">Dashboard de gastos</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-8 px-3 rounded bg-surface-container-high font-label text-[10px] text-on-surface-variant">
            <Calendar className="h-3.5 w-3.5" />
            <span>{balance.mesSeleccionado || "Todos"}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <GraficoCategoriaInteractivo registros={balance.categoriasMes} comprasMes={balance.comprasMes} />
      <GraficoEtiquetasInteractivo registros={balance.etiquetasMes} comprasMes={balance.comprasMes} />
      <GraficoMensual compras={balance.compras.compras} />
    </section>
  );
}
