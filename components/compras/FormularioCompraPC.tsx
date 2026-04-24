"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso, formatearFecha } from "@/lib/formatear";
import { fechaLocalISO } from "@/lib/utiles";
import { cargarMapaLugares, cargarMapaDetalles } from "@/lib/categorizacion";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
  comprasHistoria?: Array<{ nombre_lugar: string; fecha?: string; items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }> }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `tmp-${crypto.randomUUID()}`;
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function repartoDesdePagador(p: CompraEditable["pagador_general"]): TipoReparto {
  if (p === "franco") return "solo_franco";
  if (p === "fabiola") return "solo_fabiola";
  return "50/50";
}

function itemVacio(pagador: CompraEditable["pagador_general"]): ItemEditable {
  const t = repartoDesdePagador(pagador);
  const r = calcularReparto(t, 0, 0, 0);
  return { id: genId(), descripcion: "", categoria_id: "", subcategoria_id: "", expresion_monto: "", monto_resuelto: 0, tipo_reparto: t, pago_franco: r.pago_franco, pago_fabiola: r.pago_fabiola, etiquetas_ids: [] };
}

function recalcular(item: ItemEditable) {
  let monto = 0;
  if (item.expresion_monto.trim()) { try { monto = evaluarExpresion(item.expresion_monto); } catch { monto = item.monto_resuelto; } }
  const r = calcularReparto(item.tipo_reparto, monto, item.pago_franco, item.pago_fabiola);
  return { ...item, monto_resuelto: monto, pago_franco: r.pago_franco, pago_fabiola: r.pago_fabiola };
}

function crearCompraInicial(def: string, inicial?: CompraEditable | null, historia: Array<{ nombre_lugar: string; fecha?: string; items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }> }> = []): CompraEditable {
  if (inicial) return { ...inicial, estado: inicial.estado ?? "confirmada", pagador_general: inicial.pagador_general ?? "compartido", etiquetas_compra_ids: inicial.etiquetas_compra_ids ?? [], items: (inicial.items.length ? inicial.items : [itemVacio("compartido")]).map(i => ({ ...i, id: i.id ?? genId(), etiquetas_ids: i.etiquetas_ids ?? [] })) };
  const ultimaFecha = historia.length > 0 && historia[0].fecha ? historia[0].fecha : fechaLocalISO();
  return { fecha: ultimaFecha, nombre_lugar: "", notas: "", registrado_por: def, estado: "confirmada", pagador_general: "compartido", etiquetas_compra_ids: [], items: [itemVacio("compartido")] };
}

// ─── Fila Item (memo'd) ────────────────────────────────────────────────────

interface FilaItemProps {
  item: ItemEditable;
  index: number;
  categorias: Categoria[];
  subsPorCat: Map<string, Subcategoria[]>;
  etiquetas: Etiqueta[];
  colorFran: string;
  colorFabi: string;
  onChange: (id: string, changes: Partial<ItemEditable>, recalc?: boolean) => void;
  onDelete: (id: string) => void;
  sugerencias: Array<{ descripcion: string; categoria_id?: string; subcategoria_id?: string; ultimoMonto?: number }>;
  lugarCategoriaSugerida?: string;
  lugarSubcategoriaSugerida?: string;
  onItemFocus?: (index: number, field: string) => void;
}

const FilaItem = memo(function FilaItem({ item, index, categorias, subsPorCat, colorFran, colorFabi, onChange, onDelete, sugerencias, onItemFocus }: FilaItemProps) {
  const subs = useMemo(() => item.categoria_id ? (subsPorCat.get(item.categoria_id) ?? []) : [], [item.categoria_id, subsPorCat]);
  const [buscandoDesc, setBuscandoDesc] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const catNombre = categorias.find(c => c.id === item.categoria_id)?.nombre ?? "";
  const subNombre = subs.find(s => s.id === item.subcategoria_id)?.nombre ?? "";

  const filteredSugerencias = useMemo(() => {
    if (!buscandoDesc) return sugerencias.slice(0, 6);
    const q = buscandoDesc.toLowerCase();
    return sugerencias.filter(s => s.descripcion.toLowerCase().includes(q)).slice(0, 6);
  }, [buscandoDesc, sugerencias]);

  const tieneDatos = item.descripcion || item.expresion_monto || item.categoria_id;

  function handleDescSelect(desc: string, catId?: string, subId?: string, monto?: number) {
    const changes: Partial<ItemEditable> = {
      descripcion: desc,
      ...(catId && { categoria_id: catId }),
      ...(subId && { subcategoria_id: subId }),
    };
    if (monto) changes.expresion_monto = String(monto);
    onChange(item.id!, changes, !!monto);
    setMostrarSugerencias(false);
  }

  return (
    <tr className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
      {/* Descripción */}
      <td className="py-1 pr-1 min-w-[160px] relative">
        <input
          type="text"
          value={item.descripcion}
          onChange={(e) => { setBuscandoDesc(e.target.value); onChange(item.id!, { descripcion: e.target.value }); setMostrarSugerencias(true); }}
          onFocus={() => { setBuscandoDesc(item.descripcion); setMostrarSugerencias(true); }}
          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
          placeholder="Descripción..."
          className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/30"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onItemFocus?.(index, "monto"); }
          }}
        />
        {mostrarSugerencias && filteredSugerencias.length > 0 && (
          <div className="absolute top-full left-0 z-20 w-64 bg-surface-container-lowest border border-outline-variant/15 rounded-lg shadow-lg overflow-hidden">
            {filteredSugerencias.map((s, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={() => handleDescSelect(s.descripcion, s.categoria_id, s.subcategoria_id, s.ultimoMonto)}
                className="w-full text-left px-2.5 py-1.5 text-xs text-on-surface hover:bg-surface-container-high flex items-center justify-between"
              >
                <span>{s.descripcion}</span>
                {s.ultimoMonto && <span className="text-[10px] text-on-surface-variant/50 tabular-nums">{formatearPeso(s.ultimoMonto)}</span>}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Monto */}
      <td className="py-1 px-1 min-w-[80px]">
        <input
          type="text"
          inputMode="numeric"
          value={item.expresion_monto}
          onChange={(e) => onChange(item.id!, { expresion_monto: e.target.value }, true)}
          placeholder="$0"
          className="w-full bg-transparent text-sm text-on-surface tabular-nums outline-none placeholder:text-on-surface-variant/30"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onItemFocus?.(index, "categoria"); } }}
        />
      </td>

      {/* Categoría */}
      <td className="py-1 px-1 min-w-[140px] relative">
        <select
          value={item.categoria_id}
          onChange={(e) => onChange(item.id!, { categoria_id: e.target.value, subcategoria_id: "" }, true)}
          className="bg-transparent text-xs text-on-surface outline-none cursor-pointer w-full"
        >
          <option value="">Cat.</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </td>

      {/* Subcategoría */}
      <td className="py-1 px-1 min-w-[140px] relative">
        {subs.length > 0 ? (
          <select
            value={item.subcategoria_id}
            onChange={(e) => onChange(item.id!, { subcategoria_id: e.target.value }, true)}
            className="bg-transparent text-xs text-on-surface outline-none cursor-pointer w-full"
          >
            <option value="">Sub.</option>
            {subs.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-on-surface-variant/30">—</span>
        )}
      </td>

      {/* Reparto */}
      <td className="py-1 px-1 min-w-[90px]">
        <select
          value={item.tipo_reparto}
          onChange={(e) => onChange(item.id!, { tipo_reparto: e.target.value as TipoReparto }, true)}
          className="bg-transparent text-xs text-on-surface outline-none cursor-pointer"
        >
          <option value="50/50">50/50</option>
          <option value="solo_franco">S. Franco</option>
          <option value="solo_fabiola">S. Fabiola</option>
          <option value="personalizado">Personal.</option>
        </select>
      </td>

      {/* Pago Franco */}
      <td className="py-1 px-1 min-w-[70px] text-right">
        <span className="text-xs tabular-nums" style={{ color: colorFran }}>
          {item.pago_franco > 0 ? formatearPeso(Math.round(item.pago_franco)) : "—"}
        </span>
      </td>

      {/* Pago Fabiola */}
      <td className="py-1 px-1 min-w-[70px] text-right">
        <span className="text-xs tabular-nums" style={{ color: colorFabi }}>
          {item.pago_fabiola > 0 ? formatearPeso(Math.round(item.pago_fabiola)) : "—"}
        </span>
      </td>

      {/* Reparto personalizado */}
      {item.tipo_reparto === "personalizado" && (
        <td colSpan={8} className="py-1 px-2 bg-surface-container-low/30">
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              <span style={{ color: colorFran }}>Franco $</span>
              <input
                type="text"
                inputMode="numeric"
                value={item.pago_franco || ""}
                onChange={(e) => onChange(item.id!, { pago_franco: parseFloat(e.target.value) || 0 })}
                className="w-20 bg-surface-container-low rounded px-1.5 py-0.5 text-xs tabular-nums outline-none"
              />
            </label>
            <label className="flex items-center gap-1">
              <span style={{ color: colorFabi }}>Fabiola $</span>
              <input
                type="text"
                inputMode="numeric"
                value={item.pago_fabiola || ""}
                onChange={(e) => onChange(item.id!, { pago_fabiola: parseFloat(e.target.value) || 0 })}
                className="w-20 bg-surface-container-low rounded px-1.5 py-0.5 text-xs tabular-nums outline-none"
              />
            </label>
            {Math.abs(item.pago_franco + item.pago_fabiola - item.monto_resuelto) > 0.5 && item.monto_resuelto > 0 && (
              <span className="text-error text-[10px]">No coincide con {formatearPeso(item.monto_resuelto)}</span>
            )}
          </div>
        </td>
      )}

      {/* Eliminar */}
      <td className="py-1 pl-1 w-8">
        <button
          type="button"
          onClick={() => onDelete(item.id!)}
          className={`w-5 h-5 flex items-center justify-center rounded text-on-surface-variant/30 hover:text-error hover:bg-error-container/30 transition-colors ${!tieneDatos ? "opacity-40" : ""}`}
          title={tieneDatos ? "Eliminar item" : ""}
        >
          ×
        </button>
      </td>
    </tr>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export function FormularioCompraPC({ categorias, subcategorias, etiquetas, nombres, registradoPorDefecto, compraInicial, onGuardar, comprasHistoria = [] }: Props) {
  const config = usarConfiguracion();
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial, comprasHistoria));
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);

  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

  // Subcategories by category
  const subsPorCat = useMemo(() => {
    const m = new Map<string, Subcategoria[]>();
    for (const s of subcategorias) {
      const a = m.get(s.categoria_id) ?? []; a.push(s); m.set(s.categoria_id, a);
    }
    return m;
  }, [subcategorias]);

  // History maps
  const mapaLugares = useMemo(() => cargarMapaLugares(comprasHistoria), [comprasHistoria]);
  const mapaDetalles = useMemo(() => cargarMapaDetalles(comprasHistoria), [comprasHistoria]);

  // Totals
  const total = useMemo(() => compra.items.reduce((a, i) => a + i.monto_resuelto, 0), [compra.items]);
  const totalFranco = useMemo(() => compra.items.reduce((a, i) => a + i.pago_franco, 0), [compra.items]);
  const totalFabiola = useMemo(() => compra.items.reduce((a, i) => a + i.pago_fabiola, 0), [compra.items]);

  // Category breakdown for summary panel
  const desgloseCategoria = useMemo(() => {
    const map = new Map<string, { nombre: string; color: string; total: number }>();
    for (const item of compra.items) {
      if (item.monto_resuelto <= 0) continue;
      const cat = categorias.find(c => c.id === item.categoria_id);
      const key = item.categoria_id || "__sin__";
      const existente = map.get(key);
      if (existente) existente.total += item.monto_resuelto;
      else map.set(key, { nombre: cat?.nombre || "Sin categoría", color: cat?.color || "#9ca3af", total: item.monto_resuelto });
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [compra.items, categorias]);

  // Suggestions per item (simplified)
  const sugerenciasGlobales = useMemo(() => {
    const freq: Record<string, { count: number; catId?: string; subId?: string; monto: number }> = {};
    for (const h of comprasHistoria) {
      for (const it of h.items) {
        const key = (it.descripcion || "").toLowerCase().trim();
        if (!key) continue;
        if (!freq[key]) freq[key] = { count: 0, monto: 0 };
        freq[key].count++;
        if (it.categoria_id) freq[key].catId = it.categoria_id;
        if (it.subcategoria_id) freq[key].subId = it.subcategoria_id;
      }
    }
    // Also check recent items in current purchase
    for (const it of compra.items) {
      const key = (it.descripcion || "").toLowerCase().trim();
      if (!key || it.monto_resuelto <= 0) continue;
      if (!freq[key]) freq[key] = { count: 0, monto: 0 };
      freq[key].count++;
      freq[key].monto = it.monto_resuelto;
      if (it.categoria_id) freq[key].catId = it.categoria_id;
      if (it.subcategoria_id) freq[key].subId = it.subcategoria_id;
    }
    return Object.entries(freq)
      .map(([desc, data]) => ({ descripcion: desc, categoria_id: data.catId, subcategoria_id: data.subId, ultimoMonto: data.monto }))
      .sort((a, b) => (b.ultimoMonto || 0) - (a.ultimoMonto || 0));
  }, [comprasHistoria, compra.items]);

  // Suggested category/subcategory from place
  const lugarCategoriaSugerida = useMemo(() => {
    if (!compra.nombre_lugar) return undefined;
    const placeData = mapaDetalles.get(compra.nombre_lugar);
    return placeData?.categoria_id;
  }, [compra.nombre_lugar, mapaDetalles]);

  const lugarSubcategoriaSugerida = useMemo(() => {
    if (!compra.nombre_lugar) return undefined;
    const placeData = mapaDetalles.get(compra.nombre_lugar);
    return placeData?.subcategoria_id;
  }, [compra.nombre_lugar, mapaDetalles]);

  // State updates
  const set = useCallback((c: Partial<CompraEditable>) => setCompra(a => ({ ...a, ...c })), []);

  const setItem = useCallback((id: string, changes: Partial<ItemEditable>, recalc = false) => {
    setCompra(a => ({
      ...a,
      items: a.items.map(i => i.id !== id ? i : recalc ? recalcular({ ...i, ...changes }) : { ...i, ...changes }),
    }));
  }, []);

  const addItem = useCallback(() => {
    const lastItem = compra.items[compra.items.length - 1];
    const reparto = lastItem?.tipo_reparto ?? repartoDesdePagador(compra.pagador_general);
    const newItem = recalcular({ ...itemVacio(compra.pagador_general), id: genId(), tipo_reparto: reparto });
    setCompra(a => ({ ...a, items: [...a.items, newItem] }));
    // Focus on description of new item
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[placeholder="Descripción..."]');
      (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
    }, 50);
  }, [compra.items, compra.pagador_general]);

  const deleteItem = useCallback((id: string) => {
    setCompra(a => {
      const remaining = a.items.filter(i => i.id !== id);
      return { ...a, items: remaining.length ? remaining : [itemVacio(a.pagador_general)] };
    });
  }, []);

  const toggleEtiquetaCompra = useCallback((id: string) => {
    setCompra(a => ({
      ...a,
      etiquetas_compra_ids: a.etiquetas_compra_ids.includes(id)
        ? a.etiquetas_compra_ids.filter(x => x !== id)
        : [...a.etiquetas_compra_ids, id],
    }));
  }, []);

  // Item focus handler for tab navigation
  const handleItemFocus = useCallback((_index: number, _field: string) => {
    // No-op: keyboard navigation is handled by the browser
  }, []);

  // Validation
  const validar = useCallback((): string[] => {
    const errs: string[] = [];
    if (!compra.nombre_lugar.trim()) errs.push("Falta el lugar");
    if (!compra.fecha) errs.push("Falta la fecha");
    const itemsValidos = compra.items.filter(i => i.descripcion.trim() || i.monto_resuelto > 0);
    if (itemsValidos.length === 0) errs.push("No hay items");
    for (const item of compra.items) {
      if (!item.descripcion.trim() && item.monto_resuelto > 0) errs.push(`Item sin descripción con monto ${formatearPeso(item.monto_resuelto)}`);
      if (item.descripcion.trim() && item.monto_resuelto <= 0) errs.push(`"${item.descripcion}" sin monto`);
      if (item.tipo_reparto === "personalizado" && Math.abs(item.pago_franco + item.pago_fabiola - item.monto_resuelto) > 1) {
        errs.push(`"${item.descripcion}" el reparto no coincide con el monto`);
      }
    }
    return errs;
  }, [compra]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter = save
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const errs = validar();
        if (errs.length > 0) { setErrores(errs); return; }
        void guardarCompra("confirmada");
      }
      // Escape = cancel
      if (e.key === "Escape") {
        e.preventDefault();
        const hasData = compra.nombre_lugar || compra.items.some(i => i.descripcion || i.monto_resuelto > 0);
        if (hasData && confirm("¿Cancelar? Se perderán los cambios.")) {
          window.history.back();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [validar, compra]);

  // Save
  async function guardarCompra(estado: "borrador" | "confirmada") {
    const errs = validar();
    if (errs.length > 0) { setErrores(errs); return; }
    setGuardando(true);
    setErrores([]);
    try {
      await onGuardar({ ...compra, estado, notas: compra.notas ?? "" });
    } catch (e) {
      setErrores([e instanceof Error ? e.message : "Error al guardar"]);
    } finally {
      setGuardando(false);
    }
  }

  // Reparto global
  function aplicarRepartoGlobal(tipo: TipoReparto) {
    const tienePersonalizado = compra.items.some(i => i.tipo_reparto === "personalizado");
    if (tienePersonalizado) {
      if (!confirm("Hay items con reparto personalizado. ¿Aplicar tipo de reparto a todos?")) return;
    }
    setCompra(a => ({
      ...a,
      pagador_general: tipo === "solo_franco" ? "franco" : tipo === "solo_fabiola" ? "fabiola" : "compartido",
      items: a.items.map(i => recalcular({ ...i, tipo_reparto: tipo })),
    }));
  }

  // Place suggestions
  const lugaresSugeridos = useMemo(() => [...mapaLugares].map(([k]) => k).slice(0, 20), [mapaLugares]);

  // Date shortcuts
  const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
  const anteayer = new Date(); anteayer.setDate(anteayer.getDate() - 2);
  const fechaStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex gap-4 max-w-[1400px] mx-auto pb-24">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* ═══ ZONA 1: Encabezado ═══ */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px] gap-3">
            {/* Lugar */}
            <div>
              <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Lugar</label>
              <div className="relative">
                <input
                  type="text"
                  value={compra.nombre_lugar}
                  onChange={(e) => set({ nombre_lugar: e.target.value })}
                  placeholder="¿Dónde compraste?"
                  list="lugares-list"
                  className="w-full h-10 rounded-xl bg-surface-container-low px-3 text-sm text-on-surface outline-none border border-outline-variant/10 focus:border-secondary transition-colors"
                  autoFocus
                />
                <datalist id="lugares-list">
                  {lugaresSugeridos.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Fecha</label>
              <div className="flex items-center gap-1">
                {[
                  { label: "Hoy", val: fechaLocalISO() },
                  { label: "Ayer", val: fechaStr(ayer) },
                  { label: "Ant.", val: fechaStr(anteayer) },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set({ fecha: val })}
                    className={`px-1.5 py-1 rounded-lg text-[9px] font-medium transition-colors ${compra.fecha === val ? "bg-secondary text-on-secondary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    {label}
                  </button>
                ))}
                <input
                  type="date"
                  value={compra.fecha}
                  onChange={(e) => set({ fecha: e.target.value })}
                  className="h-7 rounded-lg bg-surface-container-low px-1 text-[10px] text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Quién pagó */}
            <div>
              <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Quién pagó</label>
              <select
                value={compra.pagador_general}
                onChange={(e) => set({ pagador_general: e.target.value as CompraEditable["pagador_general"] })}
                className="w-full h-10 rounded-xl bg-surface-container-low px-3 text-sm text-on-surface outline-none border border-outline-variant/10 focus:border-secondary transition-colors"
              >
                <option value="compartido">Compartido</option>
                <option value="franco">{nombres.franco}</option>
                <option value="fabiola">{nombres.fabiola}</option>
              </select>
            </div>
          </div>

          {/* Tags de la compra */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {etiquetas.map(et => {
                const activo = compra.etiquetas_compra_ids.includes(et.id);
                return (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => toggleEtiquetaCompra(et.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${activo ? "text-white" : ""}`}
                    style={{
                      backgroundColor: activo ? et.color : "transparent",
                      border: `1px solid ${activo ? et.color : "var(--color-outline-variant, #d4c3be)"}`,
                    }}
                  >
                    {et.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reparto global */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Reparto de todos los items</label>
            <div className="flex gap-1.5">
              {[
                { tipo: "50/50" as TipoReparto, label: "50/50" },
                { tipo: "solo_franco" as TipoReparto, label: `Solo ${nombres.franco}` },
                { tipo: "solo_fabiola" as TipoReparto, label: `Solo ${nombres.fabiola}` },
              ].map(({ tipo, label }) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => aplicarRepartoGlobal(tipo)}
                  className="px-3 py-1 rounded-full text-[10px] font-medium bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ ZONA 2: Items ═══ */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
          <div className="px-4 py-2 border-b border-outline-variant/10 flex items-center justify-between">
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60">Items ({compra.items.length})</span>
            <button
              type="button"
              onClick={addItem}
              className="text-[11px] text-secondary hover:text-secondary/80 font-medium flex items-center gap-0.5"
            >
              + Agregar item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-surface-container-low/50">
                  <th className="py-1.5 px-1 text-left text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[160px]">Descripción</th>
                  <th className="py-1.5 px-1 text-right text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[80px]">Monto</th>
                  <th className="py-1.5 px-1 text-left text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[140px]">Categoría</th>
                  <th className="py-1.5 px-1 text-left text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[140px]">Subcategoría</th>
                  <th className="py-1.5 px-1 text-left text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[90px]">Reparto</th>
                  <th className="py-1.5 px-1 text-right text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[70px]" style={{ color: colorFran }}>{nombres.franco.slice(0, 3)}</th>
                  <th className="py-1.5 px-1 text-right text-[9px] font-medium uppercase tracking-wider text-on-surface-variant/50 min-w-[70px]" style={{ color: colorFabi }}>{nombres.fabiola.slice(0, 3)}</th>
                  <th className="py-1.5 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {compra.items.map((item, i) => (
                  <FilaItem
                    key={item.id}
                    item={item}
                    index={i}
                    categorias={categorias}
                    subsPorCat={subsPorCat}
                    etiquetas={etiquetas}
                    colorFran={colorFran}
                    colorFabi={colorFabi}
                    onChange={setItem}
                    onDelete={deleteItem}
                    sugerencias={sugerenciasGlobales}
                    lugarCategoriaSugerida={lugarCategoriaSugerida}
                    lugarSubcategoriaSugerida={lugarSubcategoriaSugerida}
                    onItemFocus={handleItemFocus}
                  />
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-outline-variant/20 bg-surface-container-low/30">
                  <td colSpan={1} className="py-2 px-1 text-right text-xs font-medium text-on-surface-variant/60">Total</td>
                  <td className="py-2 px-1 text-right text-sm font-bold tabular-nums text-on-surface">{formatearPeso(total)}</td>
                  <td colSpan={4}></td>
                  <td className="py-2 px-1 text-right text-xs tabular-nums font-medium" style={{ color: colorFran }}>{formatearPeso(totalFranco)}</td>
                  <td className="py-2 px-1 text-right text-xs tabular-nums font-medium" style={{ color: colorFabi }}>{formatearPeso(totalFabiola)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ═══ ZONA 3: Cierre ═══ */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 space-y-3">
          {/* Notas */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-1 block">Notas</label>
            <textarea
              value={compra.notas ?? ""}
              onChange={(e) => set({ notas: e.target.value })}
              placeholder="Notas opcionales..."
              rows={2}
              className="w-full rounded-xl bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none border border-outline-variant/10 focus:border-secondary resize-y transition-colors"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/60 mb-2 block">Estado</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="estado"
                  value="confirmada"
                  checked={compra.estado === "confirmada"}
                  onChange={() => set({ estado: "confirmada" })}
                  className="accent-secondary"
                />
                <span className="text-sm text-on-surface">Confirmada</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="estado"
                  value="borrador"
                  checked={compra.estado === "borrador"}
                  onChange={() => set({ estado: "borrador" })}
                  className="accent-secondary"
                />
                <span className="text-sm text-on-surface-variant">Borrador</span>
              </label>
            </div>
          </div>

          {/* Errores */}
          {errores.length > 0 && (
            <div className="bg-error-container rounded-lg px-3 py-2 space-y-0.5">
              {errores.map((e, i) => (
                <p key={i} className="text-[12px] text-error">• {e}</p>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => guardarCompra("borrador")}
              disabled={guardando}
              className="px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-sm font-medium hover:bg-surface-container-high disabled:opacity-50 transition-colors"
            >
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={() => guardarCompra("confirmada")}
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary font-headline text-sm font-bold hover:bg-secondary/90 disabled:opacity-50 shadow-lg shadow-secondary/20 transition-all"
            >
              {guardando ? "Guardando..." : "Confirmar compra ✓"}
            </button>
          </div>

          <p className="text-[9px] text-on-surface-variant/30">
            <kbd className="px-1 py-0.5 rounded bg-surface-container-low text-[8px]">Ctrl+Enter</kbd> confirmar · <kbd className="px-1 py-0.5 rounded bg-surface-container-low text-[8px]">Esc</kbd> cancelar
          </p>
        </div>
      </div>

      {/* ═══ PANEL STICKY: Resumen ═══ */}
      <div className="hidden xl:block w-[240px] shrink-0">
        <div className="sticky top-4 space-y-3">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-3 space-y-2.5">
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50">Resumen</p>

            {/* Header info */}
            <div className="space-y-0.5 text-xs text-on-surface-variant/70">
              {compra.nombre_lugar && <p className="text-on-surface font-medium">{compra.nombre_lugar}</p>}
              {compra.fecha && <p>{formatearFecha(compra.fecha)}</p>}
              <p>{compra.pagador_general === "franco" ? nombres.franco : compra.pagador_general === "fabiola" ? nombres.fabiola : "Compartido"} pagó</p>
            </div>

            <div className="h-px bg-outline-variant/10" />

            {/* Totals */}
            <div className="space-y-0.5">
              <p className="text-[10px] text-on-surface-variant/40">{compra.items.filter(i => i.monto_resuelto > 0).length} items</p>
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant/60">Total</span>
                  <span className="font-bold tabular-nums text-on-surface">{formatearPeso(total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: colorFran }}>{nombres.franco.slice(0, 3)}</span>
                  <span className="tabular-nums" style={{ color: colorFran }}>{formatearPeso(totalFranco)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: colorFabi }}>{nombres.fabiola.slice(0, 3)}</span>
                  <span className="tabular-nums" style={{ color: colorFabi }}>{formatearPeso(totalFabiola)}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-outline-variant/10" />

            {/* Category breakdown */}
            <div className="space-y-0.5">
              {desgloseCategoria.map(([key, cat]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-on-surface-variant/70 truncate">{cat.nombre}</span>
                  </div>
                  <span className="tabular-nums text-on-surface shrink-0">{formatearPeso(cat.total)}</span>
                </div>
              ))}
            </div>

            {/* Active tags */}
            {compra.etiquetas_compra_ids.length > 0 && (
              <>
                <div className="h-px bg-outline-variant/10" />
                <div className="flex flex-wrap gap-1">
                  {etiquetas.filter(e => compra.etiquetas_compra_ids.includes(e.id)).map(e => (
                    <span key={e.id} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${e.color}30`, color: e.color }}>
                      {e.nombre}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="h-px bg-outline-variant/10" />

            {/* Confirm button */}
            <button
              type="button"
              onClick={() => guardarCompra("confirmada")}
              disabled={guardando}
              className="w-full py-2.5 rounded-xl bg-secondary text-on-secondary font-label text-xs font-bold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
            >
              {guardando ? "Guardando..." : "Confirmar ✓"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => guardarCompra("confirmada")}
        disabled={guardando}
        className="xl:hidden fixed bottom-6 right-4 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-secondary text-on-secondary font-headline text-sm font-bold shadow-lg shadow-secondary/30 hover:bg-secondary/90 disabled:opacity-50 active:scale-95 transition-all"
      >
        {guardando ? "Guardando..." : `Confirmar ${formatearPeso(total)}`}
      </button>
    </div>
  );
}
