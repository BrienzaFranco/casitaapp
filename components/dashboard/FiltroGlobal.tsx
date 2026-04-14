"use client";

import { X } from "lucide-react";
import type { Categoria, Compra, Etiqueta, Item } from "@/types";

export type PersonaFiltro = "todos" | "franco" | "fabiola";

export interface FiltroActivo {
  persona: PersonaFiltro;
  categoriaId: string | null;
  etiquetaId: string | null;
}

interface Props {
  filtro: FiltroActivo;
  setFiltro: (f: FiltroActivo) => void;
  categorias: Categoria[];
  etiquetas: Etiqueta[];
}

export function FiltroGlobal({ filtro, setFiltro, categorias, etiquetas }: Props) {
  // Only show categories/tags that actually have spending this month
  const catsConGasto = categorias.filter((c) => c.id).slice(0, 15);
  const etsConGasto = etiquetas.filter((e) => e.id).slice(0, 8);

  const tieneFiltro = filtro.persona !== "todos" || filtro.categoriaId || filtro.etiquetaId;

  function etiquetasActivas(): string[] {
    const partes: string[] = [];
    if (filtro.persona !== "todos") {
      partes.push(filtro.persona === "franco" ? "Franco" : "Fabiola");
    }
    if (filtro.categoriaId) {
      const cat = categorias.find((c) => c.id === filtro.categoriaId);
      if (cat) partes.push(cat.nombre);
    }
    if (filtro.etiquetaId) {
      const et = etiquetas.find((e) => e.id === filtro.etiquetaId);
      if (et) partes.push(et.nombre);
    }
    return partes;
  }

  return (
    <>
      {/* Filter bar */}
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
        <div className="max-w-[430px] mx-auto px-4 py-2 space-y-2">
          {/* Persona pills */}
          <div className="flex gap-1.5">
            {(["todos", "franco", "fabiola"] as PersonaFiltro[]).map((p) => {
              const activo = filtro.persona === p;
              let pillClass =
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ";
              if (activo) {
                pillClass +=
                  "bg-surface-container-high border-outline-variant/30 text-on-surface";
              } else {
                pillClass +=
                  "bg-transparent border-outline-variant/15 text-on-surface-variant/60 hover:bg-surface-container-low";
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFiltro({ ...filtro, persona: p })}
                  className={pillClass}
                >
                  {p === "todos" ? "Todos" : p === "franco" ? "Franco" : "Fabiola"}
                </button>
              );
            })}
          </div>

          {/* Category chips (horizontal scroll) */}
          {catsConGasto.length > 0 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {catsConGasto.map((cat) => {
                const activo = filtro.categoriaId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setFiltro({
                        ...filtro,
                        categoriaId: activo ? null : cat.id,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                    style={{
                      backgroundColor: activo ? cat.color : "transparent",
                      color: activo ? "#fff" : "var(--color-text-secondary, var(--text-on-surface-variant))",
                      border: `1px solid ${activo ? cat.color : "var(--color-border-tertiary, rgba(0,0,0,0.08))"}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tag chips */}
          {etsConGasto.length > 0 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
              {etsConGasto.map((et) => {
                const activo = filtro.etiquetaId === et.id;
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() =>
                      setFiltro({
                        ...filtro,
                        etiquetaId: activo ? null : et.id,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
                    style={{
                      backgroundColor: activo ? et.color : "transparent",
                      color: activo ? "#fff" : "var(--color-text-secondary, var(--text-on-surface-variant))",
                      border: `1px solid ${activo ? et.color : "var(--color-border-tertiary, rgba(0,0,0,0.08))"}`,
                    }}
                  >
                    {et.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active filter banner */}
      {tieneFiltro && (
        <div className="max-w-[430px] mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between bg-[#E6F1FB] rounded-[10px] px-2.5 py-1.5">
            <div className="flex items-center gap-1 text-[11px] text-[#042C53] overflow-hidden">
              <span className="shrink-0 opacity-70">Mostrando:</span>
              <span className="font-medium truncate">{etiquetasActivas().join(" · ")}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setFiltro({ persona: "todos", categoriaId: null, etiquetaId: null })
              }
              className="w-5 h-5 flex items-center justify-center rounded-full text-[#042C53] hover:bg-[#d0e5f5] shrink-0 ml-2"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Filter purchases by persona/category/tag.
 * Persona filter uses pago_franco/pago_fabiola, NOT monto_resuelto.
 */
export function filtrarCompras(compras: Compra[], filtro: FiltroActivo) {
  let resultado = compras;

  // Filter by category
  if (filtro.categoriaId) {
    resultado = resultado.filter((c) =>
      c.items.some((i) => i.categoria_id === filtro.categoriaId),
    );
  }

  // Filter by tag
  if (filtro.etiquetaId) {
    resultado = resultado.filter(
      (c) =>
        c.items.some((i) => i.etiquetas?.some((e) => e.id === filtro.etiquetaId)) ||
        c.etiquetas_compra?.some((e) => e.id === filtro.etiquetaId),
    );
  }

  return resultado;
}

/**
 * Calculate the total amount for filtered data.
 * Persona filter: uses pago_franco or pago_fabiola per item.
 * Without persona filter: uses monto_resuelto.
 */
export function montoFiltrado(compras: Compra[], filtro: FiltroActivo): number {
  let total = 0;

  for (const compra of compras) {
    for (const item of compra.items) {
      let montoItem = item.monto_resuelto;

      // Apply category filter
      if (filtro.categoriaId && item.categoria_id !== filtro.categoriaId) continue;

      // Apply tag filter
      const tieneTag =
        item.etiquetas?.some((e) => e.id === filtro.etiquetaId) ||
        compra.etiquetas_compra?.some((e) => e.id === filtro.etiquetaId);
      if (filtro.etiquetaId && !tieneTag) continue;

      // Apply persona filter
      if (filtro.persona === "franco") {
        montoItem = item.pago_franco;
      } else if (filtro.persona === "fabiola") {
        montoItem = item.pago_fabiola;
      }

      total += montoItem;
    }
  }

  return total;
}

/**
 * Get filtered items (individual line items that pass the filter).
 */
export function obtenerItemsFiltrados(
  compras: Compra[],
  filtro: FiltroActivo,
) {
  const items: (Item & { compraFecha: string; compraLugar: string; compraPagador: string })[] = [];

  for (const compra of compras) {
    for (const item of compra.items) {
      // Category filter
      if (filtro.categoriaId && item.categoria_id !== filtro.categoriaId) continue;

      // Tag filter
      const tieneTag =
        item.etiquetas?.some((e) => e.id === filtro.etiquetaId) ||
        compra.etiquetas_compra?.some((e) => e.id === filtro.etiquetaId);
      if (filtro.etiquetaId && !tieneTag) continue;

      // Persona filter: skip items where the person pays nothing
      if (filtro.persona === "franco" && item.pago_franco <= 0) continue;
      if (filtro.persona === "fabiola" && item.pago_fabiola <= 0) continue;

      items.push({
        ...item,
        compraFecha: compra.fecha,
        compraLugar: compra.nombre_lugar,
        compraPagador: compra.pagador_general,
      });
    }
  }

  return items;
}
