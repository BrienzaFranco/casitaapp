"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronDown, Check, Search } from "lucide-react";
import type { Categoria, Compra, Etiqueta, Item } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PersonaFiltro = "franco" | "fabiola";

export interface FiltroActivo {
  personas: PersonaFiltro[]; // empty = todos
  categorias: string[]; // ids
  etiquetas: string[]; // ids
  subcategorias: string[]; // ids (conditional on selected categories)
}

// ─── Dropdown with search + multi-select + click-outside ────────────────────

interface DropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string; label: string; color?: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  countBadge?: string;
}

function DropdownFiltro({ label, icon, options, selected, onChange, countBadge }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtradas = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  }

  const count = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
        style={{
          backgroundColor: count > 0 ? "var(--color-background-high, rgba(0,0,0,0.06))" : "transparent",
          borderColor: count > 0 ? "var(--color-border-secondary, rgba(0,0,0,0.12))" : "var(--color-border-tertiary, rgba(0,0,0,0.06))",
          color: count > 0 ? "var(--color-text-primary, var(--text-on-surface))" : "var(--color-text-secondary, var(--text-on-surface-variant))",
        }}
      >
        <span className="opacity-60">{icon}</span>
        {label}
        {countBadge && <span className="text-[9px] opacity-50">{countBadge}</span>}
        {count > 0 && (
          <span className="w-4 h-4 rounded-full bg-[#5B9BD5] text-white text-[9px] flex items-center justify-center font-bold">
            {count}
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-40" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-surface-container-lowest border border-outline-variant/15 rounded-[12px] shadow-xl overflow-hidden">
          {/* Search */}
          <div className="px-2.5 pt-2 pb-1">
            <div className="flex items-center gap-1.5 bg-surface-container-low rounded-[8px] px-2 py-1">
              <Search className="h-3 w-3 text-on-surface-variant/40" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12px] outline-none text-on-surface placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto px-1.5 pb-1.5">
            {filtradas.length === 0 && (
              <p className="text-[11px] text-on-surface-variant/40 py-3 text-center">Sin resultados</p>
            )}
            {filtradas.map((opt) => {
              const activo = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] hover:bg-surface-container transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${activo ? "border-transparent" : "border-outline-variant/30"}`}
                    style={activo ? { backgroundColor: opt.color || "#5B9BD5" } : {}}
                  >
                    {activo && <Check className="h-3 w-3 text-white" />}
                  </div>
                  {opt.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  <span className="text-[12px] text-on-surface truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {count > 0 && (
            <div className="border-t border-outline-variant/10 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-on-surface-variant/60 hover:text-on-surface w-full text-center py-0.5"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main FiltroGlobal (with dropdowns) ─────────────────────────────────────

interface Props {
  filtro: FiltroActivo;
  setFiltro: (f: FiltroActivo) => void;
  categorias: Categoria[];
  etiquetas: Etiqueta[];
  subcategorias: { id: string; nombre: string; categoria_id: string }[];
}

export function FiltroGlobal({ filtro, setFiltro, categorias, etiquetas, subcategorias }: Props) {
  const tieneFiltro = filtro.personas.length > 0 || filtro.categorias.length > 0 || filtro.etiquetas.length > 0 || filtro.subcategorias.length > 0;

  // Subcategorias conditional on selected categories
  const subsDisponibles = filtro.categorias.length > 0
    ? subcategorias.filter((s) => filtro.categorias.includes(s.categoria_id))
    : [];

  function etiquetasActivas(): { label: string; onClear: () => void }[] {
    const partes: { label: string; onClear: () => void }[] = [];
    if (filtro.personas.length === 1) {
      const p = filtro.personas[0];
      partes.push({ label: p === "franco" ? "Franco" : "Fabiola", onClear: () => setFiltro({ ...filtro, personas: [] }) });
    } else if (filtro.personas.length === 2) {
      partes.push({ label: "Franco + Fabiola", onClear: () => setFiltro({ ...filtro, personas: [] }) });
    }
    for (const catId of filtro.categorias) {
      const cat = categorias.find((c) => c.id === catId);
      if (cat) partes.push({ label: cat.nombre, onClear: () => setFiltro({ ...filtro, categorias: filtro.categorias.filter((c) => c !== catId) }) });
    }
    for (const etId of filtro.etiquetas) {
      const et = etiquetas.find((e) => e.id === etId);
      if (et) partes.push({ label: et.nombre, onClear: () => setFiltro({ ...filtro, etiquetas: filtro.etiquetas.filter((e) => e !== etId) }) });
    }
    for (const subId of filtro.subcategorias) {
      const sub = subcategorias.find((s) => s.id === subId);
      if (sub) partes.push({ label: sub.nombre, onClear: () => setFiltro({ ...filtro, subcategorias: filtro.subcategorias.filter((s) => s !== subId) }) });
    }
    return partes;
  }

  return (
    <>
      {/* Filter bar */}
      <div className="sticky top-[52px] z-40 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10">
        <div className="max-w-[430px] mx-auto px-4 py-2 flex items-center gap-1.5 flex-wrap">
          {/* Persona dropdown */}
          <DropdownFiltro
            label="Todos"
            icon={
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1.5 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            }
            options={[
              { id: "franco", label: "Franco" },
              { id: "fabiola", label: "Fabiola" },
            ]}
            selected={filtro.personas}
            onChange={(personas) => setFiltro({ ...filtro, personas: personas as PersonaFiltro[] })}
          />

          {/* Category dropdown */}
          <DropdownFiltro
            label="Categoría"
            icon={
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="1" y="1" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
                <rect x="6.5" y="1" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="6.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
                <rect x="6.5" y="6.5" width="3.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            }
            options={categorias.map((c) => ({ id: c.id, label: c.nombre, color: c.color }))}
            selected={filtro.categorias}
            onChange={(categorias) => setFiltro({ ...filtro, categorias })}
          />

          {/* Tag dropdown */}
          <DropdownFiltro
            label="Etiqueta"
            icon={
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 5.5L5.5 1H8l3 3v2.5L6.5 11 1 5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="3.5" cy="3.5" r="0.8" fill="currentColor" />
              </svg>
            }
            options={etiquetas.map((e) => ({ id: e.id, label: e.nombre, color: e.color }))}
            selected={filtro.etiquetas}
            onChange={(etiquetas) => setFiltro({ ...filtro, etiquetas })}
          />

          {/* Subcategoria dropdown (conditional on selected categories) */}
          {subsDisponibles.length > 0 && (
            <DropdownFiltro
              label="Subcat."
              icon={
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 3h7M2 5.5h7M2 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
              options={subsDisponibles.map((s) => ({ id: s.id, label: s.nombre }))}
              selected={filtro.subcategorias}
              onChange={(subcategorias) => setFiltro({ ...filtro, subcategorias })}
            />
          )}
        </div>
      </div>

      {/* Active filter banner */}
      {tieneFiltro && (
        <div className="max-w-[430px] mx-auto px-4 py-1.5">
          <div className="flex items-center gap-1.5 flex-wrap bg-[#E6F1FB] rounded-[10px] px-2.5 py-1.5">
            <span className="text-[10px] text-[#042C53] opacity-60 shrink-0">Filtrando:</span>
            {etiquetasActivas().map((et, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#042C53] bg-[#d0e5f5] rounded-full px-1.5 py-0.5"
              >
                {et.label}
                <button
                  type="button"
                  onClick={et.onClear}
                  className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-[#b8d4ee] transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setFiltro({ personas: [], categorias: [], etiquetas: [], subcategorias: [] })}
              className="text-[10px] text-[#042C53]/60 hover:text-[#042C53] ml-auto shrink-0"
            >
              Limpiar todo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Filter helpers (updated for multi-select) ──────────────────────────────

/**
 * Filter purchases by persona/category/tag.
 * Persona filter: empty = todos. Uses pago_franco/pago_fabiola per item.
 */
export function filtrarCompras(compras: Compra[], filtro: FiltroActivo) {
  if (filtro.personas.length === 0 && filtro.categorias.length === 0 && filtro.etiquetas.length === 0) {
    return compras;
  }

  return compras.filter((c) => {
    // Category filter: if any selected, at least one item must match
    if (filtro.categorias.length > 0) {
      const hasCat = c.items.some((i) => i.categoria_id && filtro.categorias.includes(i.categoria_id));
      if (!hasCat) return false;
    }

    // Tag filter
    if (filtro.etiquetas.length > 0) {
      const hasTag =
        c.items.some((i) => i.etiquetas?.some((e) => filtro.etiquetas.includes(e.id))) ||
        c.etiquetas_compra?.some((e) => filtro.etiquetas.includes(e.id));
      if (!hasTag) return false;
    }

    // Subcategory filter: if any selected, at least one item must match
    if (filtro.subcategorias.length > 0) {
      const hasSub = c.items.some((i) => i.subcategoria_id && filtro.subcategorias.includes(i.subcategoria_id));
      if (!hasSub) return false;
    }

    return true;
  });
}

/**
 * Calculate total amount for filtered data.
 * Persona filter: empty = todos (uses monto_resuelto).
 * Single persona: uses that person's share.
 * Both personas: sum both shares.
 */
export function montoFiltrado(compras: Compra[], filtro: FiltroActivo): number {
  let total = 0;
  const soloFranco = filtro.personas.length === 1 && filtro.personas[0] === "franco";
  const soloFabiola = filtro.personas.length === 1 && filtro.personas[0] === "fabiola";

  for (const compra of compras) {
    for (const item of compra.items) {
      // Category filter
      if (filtro.categorias.length > 0 && (!item.categoria_id || !filtro.categorias.includes(item.categoria_id))) continue;

      // Tag filter
      const tieneTag =
        item.etiquetas?.some((e) => filtro.etiquetas.includes(e.id)) ||
        compra.etiquetas_compra?.some((e) => filtro.etiquetas.includes(e.id));
      if (filtro.etiquetas.length > 0 && !tieneTag) continue;

      // Subcategory filter
      if (filtro.subcategorias.length > 0 && (!item.subcategoria_id || !filtro.subcategorias.includes(item.subcategoria_id))) continue;

      // Persona filter
      let montoItem = item.monto_resuelto;
      if (soloFranco) montoItem = item.pago_franco;
      else if (soloFabiola) montoItem = item.pago_fabiola;
      // Both or none = use monto_resuelto

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
  const soloFranco = filtro.personas.length === 1 && filtro.personas[0] === "franco";
  const soloFabiola = filtro.personas.length === 1 && filtro.personas[0] === "fabiola";

  for (const compra of compras) {
    for (const item of compra.items) {
      if (filtro.categorias.length > 0 && (!item.categoria_id || !filtro.categorias.includes(item.categoria_id))) continue;

      const tieneTag =
        item.etiquetas?.some((e) => filtro.etiquetas.includes(e.id)) ||
        compra.etiquetas_compra?.some((e) => filtro.etiquetas.includes(e.id));
      if (filtro.etiquetas.length > 0 && !tieneTag) continue;

      // Subcategory filter
      if (filtro.subcategorias.length > 0 && (!item.subcategoria_id || !filtro.subcategorias.includes(item.subcategoria_id))) continue;

      // Persona filter: skip items where the person pays nothing
      if (soloFranco && item.pago_franco <= 0) continue;
      if (soloFabiola && item.pago_fabiola <= 0) continue;

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
