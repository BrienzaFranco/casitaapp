"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoriaBalance, Compra, Item } from "@/types";
import { formatearPeso, formatearFecha } from "@/lib/formatear";
import { mesClave } from "@/lib/utiles";
import { DeltaBadge } from "@/components/dashboard/DeltaBadge";

interface Props {
  categoria: CategoriaBalance;
  comprasMes: Compra[];
  comprasMesAnterior: Compra[];
  todasLasCompras: Compra[];
  nombres: { franco: string; fabiola: string };
  onSubcategoriaClick: (nombre: string, compras: Compra[]) => void;
  onLugarClick: (nombre: string, compras: Compra[]) => void;
  onItemClick: (item: Item, lugar: string, fecha: string, compraId: string) => void;
}

export function VistaCategoria({
  categoria,
  comprasMes,
  comprasMesAnterior,
  todasLasCompras,
  nombres,
  onSubcategoriaClick,
  onLugarClick,
  onItemClick,
}: Props) {
  const [ordenItems, setOrdenItems] = useState<"monto" | "fecha">("monto");

  const itemsDeCategoria = useMemo(() => {
    const items: Array<{ item: Item; lugar: string; fecha: string; compraId: string; pagador: string }> = [];
    for (const compra of comprasMes) {
      for (const item of compra.items) {
        if (item.categoria_id === categoria.categoria.id) {
          items.push({
            item,
            lugar: compra.nombre_lugar || "Sin lugar",
            fecha: compra.fecha,
            compraId: compra.id,
            pagador: compra.pagador_general === "franco" ? nombres.franco : compra.pagador_general === "fabiola" ? nombres.fabiola : "Ambos",
          });
        }
      }
    }
    items.sort((a, b) =>
      ordenItems === "monto"
        ? b.item.monto_resuelto - a.item.monto_resuelto
        : a.fecha.localeCompare(b.fecha)
    );
    return items;
  }, [comprasMes, categoria.categoria.id, nombres, ordenItems]);

  const totalMesAnterior = useMemo(() => {
    let total = 0;
    for (const compra of comprasMesAnterior) {
      for (const item of compra.items) {
        if (item.categoria_id === categoria.categoria.id) {
          total += item.monto_resuelto;
        }
      }
    }
    return total;
  }, [comprasMesAnterior, categoria.categoria.id]);

  const subcategoriasAgrupadas = useMemo(() => {
    return categoria.subcategorias
      .filter((s) => s.total > 0)
      .map((s) => {
        const comprasFiltradas = comprasMes.filter((c) =>
          c.items.some((i) => i.subcategoria_id === s.subcategoria.id)
        );
        return { ...s, compras: comprasFiltradas };
      });
  }, [categoria.subcategorias, comprasMes]);

  const lugaresAgrupados = useMemo(() => {
    const mapa: Record<string, { total: number; compras: Compra[] }> = {};
    for (const compra of comprasMes) {
      const lugarKey = compra.nombre_lugar || "Sin lugar";
      if (!mapa[lugarKey]) mapa[lugarKey] = { total: 0, compras: [] };
      for (const item of compra.items) {
        if (item.categoria_id === categoria.categoria.id) {
          mapa[lugarKey].total += item.monto_resuelto;
        }
      }
      if (!mapa[lugarKey].compras.some((c) => c.id === compra.id)) {
        mapa[lugarKey].compras.push(compra);
      }
    }
    return Object.entries(mapa)
      .map(([nombre, data]) => ({ nombre, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [comprasMes, categoria.categoria.id]);

  // Tendencia 6 meses
  const tendencia = useMemo(() => {
    const ahora = new Date();
    const meses: Array<{ mes: string; label: string; total: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.push({ mes: clave, label: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][d.getMonth()], total: 0 });
    }
    for (const compra of todasLasCompras) {
      const clave = mesClave(compra.fecha);
      const idx = meses.findIndex((m) => m.mes === clave);
      if (idx >= 0) {
        for (const item of compra.items) {
          if (item.categoria_id === categoria.categoria.id) {
            meses[idx].total += item.monto_resuelto;
          }
        }
      }
    }
    return meses;
  }, [todasLasCompras, categoria.categoria.id]);

  const limite = categoria.categoria.limite_mensual ?? 0;
  const pctLimite = limite > 0 ? (categoria.total / limite) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: categoria.categoria.color || "#666" }}
          />
          <div>
            <p className="font-headline text-lg font-semibold text-on-surface">{categoria.categoria.nombre}</p>
            <p className="font-headline text-2xl font-bold text-on-surface mt-0.5 tabular-nums">{formatearPeso(categoria.total)}</p>
            {totalMesAnterior > 0 && (
              <DeltaBadge actual={categoria.total} anterior={totalMesAnterior} formato="pesos" />
            )}
          </div>
        </div>
        {limite > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-on-surface-variant mb-1">
              <span>Presupuesto</span>
              <span className="tabular-nums">{formatearPeso(categoria.total)} / {formatearPeso(limite)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctLimite >= 100 ? "bg-error" : "bg-secondary"}`}
                style={{ width: `${Math.min(pctLimite, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tendencia 6 meses */}
      {tendencia.some((t) => t.total > 0) && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 p-4">
          <p className="text-[10px] uppercase tracking-widest text-outline mb-2">Tendencia 6 meses</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tendencia}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v) => formatearPeso(Number(v ?? 0))} />
                <Bar dataKey="total" fill={categoria.categoria.color || "#5B9BD5"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subcategorías */}
      {subcategoriasAgrupadas.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 divide-y divide-outline-variant/10">
          <div className="px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-widest text-outline">Subcategor&iacute;as</p>
          </div>
          {subcategoriasAgrupadas.map((s) => (
            <button
              key={s.subcategoria.id}
              type="button"
              onClick={() => onSubcategoriaClick(s.subcategoria.nombre, s.compras)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface">{s.subcategoria.nombre}</p>
                <div className="mt-1 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary"
                    style={{ width: `${categoria.total > 0 ? Math.min((s.total / categoria.total) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0 ml-3 flex items-center gap-1">
                <span className="text-sm font-semibold tabular-nums text-on-surface">{formatearPeso(s.total)}</span>
                <ChevronRight className="h-4 w-4 text-on-surface-variant/30" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lugares */}
      {lugaresAgrupados.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 divide-y divide-outline-variant/10">
          <div className="px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-widest text-outline">Lugares</p>
          </div>
          {lugaresAgrupados.map((l) => (
            <button
              key={l.nombre}
              type="button"
              onClick={() => onLugarClick(l.nombre, l.compras)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
            >
              <span className="text-sm text-on-surface">{l.nombre}</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums text-on-surface">{formatearPeso(l.total)}</span>
                <ChevronRight className="h-4 w-4 text-on-surface-variant/30" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-[10px] uppercase tracking-widest text-outline">Items ({itemsDeCategoria.length})</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrdenItems("monto")}
              className={`text-[10px] font-bold uppercase tracking-wider ${ordenItems === "monto" ? "text-secondary" : "text-on-surface-variant"}`}
            >
              Monto
            </button>
            <button
              type="button"
              onClick={() => setOrdenItems("fecha")}
              className={`text-[10px] font-bold uppercase tracking-wider ${ordenItems === "fecha" ? "text-secondary" : "text-on-surface-variant"}`}
            >
              Fecha
            </button>
          </div>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {itemsDeCategoria.map(({ item, lugar, fecha, compraId, pagador }, i) => (
            <button
              key={`${item.id || i}`}
              type="button"
              onClick={() => onItemClick(item, lugar, fecha, compraId)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-on-surface truncate">{item.descripcion || "Sin descripci\u00f3n"}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {formatearFecha(fecha)} &middot; {lugar} &middot; Pag&oacute; {pagador}
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-1">
                <span className="text-sm font-semibold tabular-nums text-on-surface">{formatearPeso(item.monto_resuelto)}</span>
                <ChevronRight className="h-4 w-4 text-on-surface-variant/30" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
