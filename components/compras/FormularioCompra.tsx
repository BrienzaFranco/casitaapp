"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { fechaLocalISO, normalizarTexto } from "@/lib/utiles";
import { cargarMapaLugares, cargarMapaDetalles, predecirCategoria } from "@/lib/categorizacion";
import { SelectBuscable } from "@/components/ui/SelectBuscable";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  guardando?: boolean;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
  comprasHistoria?: Array<{ nombre_lugar: string; items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }> }>;
  onCrearCategoria?: (nombre: string) => Promise<string | null>;
  onCrearEtiqueta?: (nombre: string) => Promise<string | null>;
}

// Colores por persona (localStorage)
function obtenerColorPersona(nombre: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(`color_${nombre}`) || fallback;
}

function hoy() { return fechaLocalISO(); }
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

function crearCompraInicial(def: string, inicial?: CompraEditable | null): CompraEditable {
  if (inicial) { guardarRegistradoPor(inicial.registrado_por); return { ...inicial, estado: inicial.estado ?? "confirmada", pagador_general: inicial.pagador_general ?? "compartido", etiquetas_compra_ids: inicial.etiquetas_compra_ids ?? [], items: (inicial.items.length ? inicial.items : [itemVacio("compartido")]).map(i => ({ ...i, id: i.id ?? genId(), etiquetas_ids: i.etiquetas_ids ?? [] })) }; }
  const reg = obtenerRegistradoPor() || def;
  guardarRegistradoPor(reg);
  return { fecha: hoy(), nombre_lugar: "", notas: "", registrado_por: reg, estado: "confirmada", pagador_general: "compartido", etiquetas_compra_ids: [], items: [itemVacio("compartido")] };
}

function recalcular(item: ItemEditable) {
  let monto = 0;
  if (item.expresion_monto.trim()) { try { monto = evaluarExpresion(item.expresion_monto); } catch { monto = item.monto_resuelto; } }
  const r = calcularReparto(item.tipo_reparto, monto, item.pago_franco, item.pago_fabiola);
  return { ...item, monto_resuelto: monto, pago_franco: r.pago_franco, pago_fabiola: r.pago_fabiola };
}

function itemsParaGuardar(items: ItemEditable[]) {
  const con = items.filter(i => i.descripcion.trim() || i.categoria_id || i.subcategoria_id || i.expresion_monto.trim() || i.etiquetas_ids.length);
  if (!con.length) return [] as ItemEditable[];
  return con.map(i => {
    if (!i.expresion_monto.trim()) throw new Error("Cada item necesita monto.");
    const m = evaluarExpresion(i.expresion_monto);
    const r = calcularReparto(i.tipo_reparto, m, i.pago_franco, i.pago_fabiola);
    return { ...i, monto_resuelto: m, pago_franco: r.pago_franco, pago_fabiola: r.pago_fabiola };
  });
}

function nombreCorto(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes("franco")) return "Fran";
  if (n.includes("fabiola")) return "Fabi";
  return nombre.slice(0, 4);
}

export function FormularioCompraUnificado({ categorias, subcategorias, etiquetas, nombres, registradoPorDefecto, compraInicial, guardando = false, onGuardar, comprasHistoria = [], onCrearCategoria, onCrearEtiqueta }: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [notas, setNotas] = useState(compraInicial?.notas ?? "");
  const [mostrarNotas, setMostrarNotas] = useState(!!compraInicial?.notas);
  const [mostrarAvanzadas, setMostrarAvanzadas] = useState(false);
  const [pegado, setPegado] = useState("");
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [etiquetasAbiertas, setEtiquetasAbiertas] = useState<Record<string, boolean>>({});
  const ref = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const total = useMemo(() => compra.items.reduce((a, i) => a + i.monto_resuelto, 0), [compra.items]);
  const totalFranco = useMemo(() => compra.items.reduce((a, i) => a + i.pago_franco, 0), [compra.items]);
  const totalFabiola = useMemo(() => compra.items.reduce((a, i) => a + i.pago_fabiola, 0), [compra.items]);
  const mapaLugares = useMemo(() => cargarMapaLugares(comprasHistoria), [comprasHistoria]);
  const mapaDetalles = useMemo(() => cargarMapaDetalles(comprasHistoria), [comprasHistoria]);

  // Colores de cada persona
  const colorFranco = obtenerColorPersona("franco", "#3b82f6");
  const colorFabiola = obtenerColorPersona("fabiola", "#10b981");
  const colorFran = useMemo(() => colorFranco, [colorFranco]);
  const colorFabi = useMemo(() => colorFabiola, [colorFabiola]);

  useEffect(() => { if (!compraInicial && registradoPorDefecto && !compra.registrado_por) { setCompra(a => ({ ...a, registrado_por: registradoPorDefecto })); guardarRegistradoPor(registradoPorDefecto); } }, [compra.registrado_por, compraInicial, registradoPorDefecto]);

  const subsPorCat = useMemo(() => { const m = new Map<string, Subcategoria[]>(); for (const s of subcategorias) { const a = m.get(s.categoria_id) ?? []; a.push(s); m.set(s.categoria_id, a); } return m; }, [subcategorias]);

  // Frequency tracking: count how often each category/subcategory is used in compra.items
  const frecuenciaCategorias = useMemo(() => {
    const freq = new Map<string, number>();
    for (const item of compra.items) {
      if (item.categoria_id) {
        freq.set(item.categoria_id, (freq.get(item.categoria_id) ?? 0) + 1);
      }
    }
    return freq;
  }, [compra.items]);

  const frecuenciaSubcategorias = useMemo(() => {
    const freq = new Map<string, number>();
    for (const item of compra.items) {
      if (item.subcategoria_id) {
        freq.set(item.subcategoria_id, (freq.get(item.subcategoria_id) ?? 0) + 1);
      }
    }
    return freq;
  }, [compra.items]);

  // Options for SelectBuscable with frequency
  const opcionesCategorias = useMemo(() => {
    return categorias.map(c => ({
      valor: c.id,
      etiqueta: c.nombre,
      color: c.color,
      frecuencia: frecuenciaCategorias.get(c.id) ?? 0,
    }));
  }, [categorias, frecuenciaCategorias]);

  const set = (c: Partial<CompraEditable>) => setCompra(a => ({ ...a, ...c }));
  const setItem = (id: string, c: Partial<ItemEditable>, recalc = false) => setCompra(a => ({
    ...a,
    items: a.items.map(i => i.id !== id ? i : recalc ? recalcular({ ...i, ...c }) : { ...i, ...c }),
  }));
  const add = () => {
    const n = { ...itemVacio(compra.pagador_general), id: genId() };
    ref.current.set(n.id, null);
    setCompra(a => ({ ...a, items: [...a.items, recalcular(n)] }));
    queueMicrotask(() => ref.current.get(n.id)?.focus());
  };
  const del = (id: string) => setCompra(a => {
    const s = a.items.filter(i => i.id !== id);
    return { ...a, items: s.length ? s : [itemVacio(a.pagador_general)] };
  });
  const toggleEtqCompra = (id: string) => setCompra(a => ({
    ...a,
    etiquetas_compra_ids: a.etiquetas_compra_ids.includes(id)
      ? a.etiquetas_compra_ids.filter(x => x !== id)
      : [...a.etiquetas_compra_ids, id],
  }));
  const toggleEtqItem = (itemId: string, etqId: string) => setCompra(a => ({
    ...a,
    items: a.items.map(i => i.id !== itemId ? i : {
      ...i,
      etiquetas_ids: i.etiquetas_ids.includes(etqId)
        ? i.etiquetas_ids.filter(x => x !== etqId)
        : [...i.etiquetas_ids, etqId],
    }),
  }));

  function encontrarCategoriaId(nombre: string) {
    const base = normalizarTexto(nombre);
    if (!base) return "";
    const ex = categorias.find(c => normalizarTexto(c.nombre) === base);
    if (ex) return ex.id;
    const ap = categorias.find(c => normalizarTexto(c.nombre).includes(base));
    return ap?.id ?? "";
  }
  function encontrarSubcategoriaId(catId: string, nombre: string) {
    const base = normalizarTexto(nombre);
    if (!base) return "";
    const cands = catId ? (subsPorCat.get(catId) ?? []) : subcategorias;
    const ex = cands.find(s => normalizarTexto(s.nombre) === base);
    if (ex) return ex.id;
    const ap = cands.find(s => normalizarTexto(s.nombre).includes(base));
    return ap?.id ?? "";
  }

  async function guardar(limpia = false) {
    try {
      setGuardandoLocal(true);
      const items = itemsParaGuardar(compra.items);
      if (!items.length) { toast.error("Agrega al menos un item."); return; }
      await onGuardar({ ...compra, notas, estado: "confirmada", items });
      if (limpia) setCompra({ ...crearCompraInicial(registradoPorDefecto, null), fecha: compra.fecha, pagador_general: compra.pagador_general, registrado_por: compra.registrado_por });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setGuardandoLocal(false); }
  }

  const franCorto = nombres.franco.slice(0, 6);
  const fabiCorto = nombres.fabiola.slice(0, 6);

  // Quien pago mas del otro
  const debeFrancoAFabiola = totalFabiola > totalFranco ? totalFabiola - totalFranco : 0;
  const debeFabiolaAFranco = totalFranco > totalFabiola ? totalFranco - totalFabiola : 0;

  // Options for tags SelectBuscable
  const opcionesEtiquetas = useMemo(() => {
    return etiquetas.map(e => ({
      valor: e.id,
      etiqueta: e.nombre,
      color: e.color,
    }));
  }, [etiquetas]);

  return (
    <div className="min-h-screen bg-surface pb-32">
      <div className="mx-auto max-w-xl px-4 pt-4 space-y-3">
        {/* Header: Lugar + Fecha + Pago en linea */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-3">
          <input
            type="text" value={compra.nombre_lugar}
            onChange={e => set({ nombre_lugar: e.target.value })}
            placeholder="Comercio (ej: Coto Palermo)"
            className="w-full bg-transparent border-b-2 border-dashed border-outline-variant/30 px-0 py-2 font-headline text-2xl font-bold tracking-tight text-on-surface outline-none placeholder:text-on-surface-variant/30 focus:border-primary"
          />

          {/* Fecha + Pago en misma linea */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 shrink-0">
              <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Fecha</span>
              <input type="date" value={compra.fecha} onChange={e => set({ fecha: e.target.value })}
                className="h-7 rounded bg-surface-container-low px-2 font-label text-xs tabular-nums text-on-surface outline-none" />
            </label>
            <label className="flex items-center gap-1.5 shrink-0">
              <span className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pago</span>
              <select value={compra.pagador_general} onChange={e => set({ pagador_general: e.target.value as "franco" | "fabiola" | "compartido" })}
                className="h-7 rounded bg-surface-container-low px-2 font-label text-xs text-on-surface outline-none">
                <option value="compartido">50/50</option>
                <option value="franco">{nombres.franco}</option>
                <option value="fabiola">{nombres.fabiola}</option>
              </select>
            </label>
          </div>

          {/* Notas toggle */}
          <button type="button" onClick={() => setMostrarNotas(!mostrarNotas)}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mostrarNotas ? "rotate-180" : ""}`} />
            <span className="font-label text-[10px] font-bold uppercase tracking-wider">Notas</span>
          </button>
          {mostrarNotas && (
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas..."
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2 font-headline text-sm text-on-surface outline-none resize-none placeholder:text-on-surface-variant/50 focus:border-b-primary" rows={2} />
          )}

          {/* Etiquetas de compra */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-outline-variant/10">
            {etiquetas.map(etq => (
              <button key={etq.id} type="button" onClick={() => toggleEtqCompra(etq.id)}
                className={`font-label text-[9px] px-2 py-0.5 rounded-full transition-colors ${compra.etiquetas_compra_ids.includes(etq.id) ? "bg-secondary text-on-secondary" : "bg-surface-variant text-on-surface-variant"}`}>
                #{etq.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-outline block">Items ({compra.items.length})</span>

          {compra.items.map((item, index) => {
            const etqAbierta = etiquetasAbiertas[item.id ?? ""];
            const subs = item.categoria_id ? (subsPorCat.get(item.categoria_id) ?? []) : [];
            const etqSeleccionadas = item.etiquetas_ids.map(id => etiquetas.find(e => e.id === id)).filter(Boolean);
            const subOpciones = item.categoria_id
              ? (subsPorCat.get(item.categoria_id) ?? []).map(s => ({
                  valor: s.id,
                  etiqueta: s.nombre,
                  frecuencia: frecuenciaSubcategorias.get(s.id) ?? 0,
                }))
              : [];

            return (
              <div key={item.id} className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 overflow-hidden">
                {/* Header: Item badge + descripcion editable + monto + eliminar */}
                <div className="flex items-center px-3 py-2 gap-2">
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-surface-variant font-label text-[9px] font-bold text-on-surface-variant shrink-0">
                    Item {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      ref={el => { if (el && !item.descripcion) ref.current.set(item.id ?? "", el); }}
                      type="text" value={item.descripcion}
                      onChange={e => {
                        setItem(item.id ?? "", { descripcion: e.target.value });
                        if (!item.categoria_id && e.target.value.length >= 4) {
                          const pred = predecirCategoria(e.target.value, mapaLugares, mapaDetalles);
                          if (pred) setItem(item.id ?? "", { categoria_id: pred.categoria_id, subcategoria_id: pred.subcategoria_id });
                        }
                      }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                      placeholder="Que compraste?"
                      className="w-full bg-transparent border-none px-0 py-0 font-headline text-xs font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
                    />
                    {item.categoria_id && (
                      <p className="font-label text-[8px] text-on-surface-variant truncate">
                        {categorias.find(c => c.id === item.categoria_id)?.nombre}
                        {item.subcategoria_id ? ` \u203A ${subs.find(s => s.id === item.subcategoria_id)?.nombre}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Monto + Eliminar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="text-right">
                      <p className="font-label text-sm font-bold tabular-nums text-primary">{formatearPeso(item.monto_resuelto)}</p>
                      {item.tipo_reparto !== "50/50" && (
                        <p className="font-label text-[8px]" style={{ color: item.tipo_reparto === "solo_franco" ? colorFran : colorFabi }}>
                          {item.tipo_reparto === "solo_franco" ? nombres.franco : nombres.fabiola}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => del(item.id ?? "")}
                      className="w-7 h-7 flex items-center justify-center rounded text-error hover:bg-error-container transition-colors"
                      title="Eliminar item">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Detail compacto */}
                <div className="px-3 pb-2.5 space-y-1.5 border-t border-outline-variant/10 pt-1.5">
                  {/* Categoria + Subcategoria con SelectBuscable */}
                  <div className="flex gap-1.5">
                    <SelectBuscable
                      opciones={opcionesCategorias}
                      valor={item.categoria_id}
                      onChange={(catId) => setItem(item.id ?? "", { categoria_id: catId, subcategoria_id: "" })}
                      placeholder="Categoria"
                      onCreateNuevo={onCrearCategoria}
                      labelNuevo="+ Categoria"
                    />
                    <SelectBuscable
                      opciones={subOpciones}
                      valor={item.subcategoria_id}
                      onChange={(subId) => setItem(item.id ?? "", { subcategoria_id: subId })}
                      placeholder="Subcat"
                      disabled={!item.categoria_id || !subOpciones.length}
                    />
                  </div>

                  {/* Monto expresion */}
                  <div className="flex items-center gap-2">
                    <span className="font-label text-sm font-bold tabular-nums text-primary shrink-0 w-20 text-right">{formatearPeso(item.monto_resuelto)}</span>
                    <input type="text" inputMode="decimal" value={item.expresion_monto}
                      onChange={e => setItem(item.id ?? "", { expresion_monto: e.target.value })}
                      onBlur={() => setItem(item.id ?? "", {}, true)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                      placeholder="200+200"
                      className="flex-1 bg-transparent border-b border-outline/20 px-0 py-1 font-label text-[10px] tabular-nums text-on-surface-variant outline-none placeholder:text-on-surface-variant/40 focus:border-b-primary" />
                  </div>

                  {/* Reparto dropdown + Etiquetas toggle juntos */}
                  <div className="flex items-center gap-1">
                    <select value={item.tipo_reparto} onChange={e => setItem(item.id ?? "", { tipo_reparto: e.target.value as TipoReparto }, true)}
                      className="h-6 rounded bg-surface-container px-1.5 font-label text-[9px] font-bold text-on-surface outline-none shrink-0"
                      style={{ width: `${Math.max(48, (item.tipo_reparto === "solo_franco" ? franCorto : item.tipo_reparto === "solo_fabiola" ? fabiCorto : "50/50").length * 7 + 28)}px` }}>
                      <option value="50/50">50/50</option>
                      <option value="solo_franco">{franCorto}</option>
                      <option value="solo_fabiola">{fabiCorto}</option>
                    </select>

                    {item.tipo_reparto === "50/50" && (
                      <span className="font-label text-[8px] tabular-nums" style={{ color: colorFran }}>{formatearPeso(item.pago_franco)}</span>
                    )}
                    {item.tipo_reparto === "solo_franco" && (
                      <span className="font-label text-[8px] tabular-nums" style={{ color: colorFran }}>{formatearPeso(item.monto_resuelto)}</span>
                    )}
                    {item.tipo_reparto === "solo_fabiola" && (
                      <span className="font-label text-[8px] tabular-nums" style={{ color: colorFabi }}>{formatearPeso(item.monto_resuelto)}</span>
                    )}

                    {/* Etiquetas toggle */}
                    <button type="button" onClick={() => setEtiquetasAbiertas(a => ({ ...a, [item.id ?? ""]: !a[item.id ?? ""] }))}
                      className="flex items-center gap-0.5 h-6 px-1.5 rounded bg-surface-container font-label text-[9px] text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0">
                      <span>Etq</span>
                      {etqSeleccionadas.length > 0 && (
                        <span className="text-[8px] px-0.5 rounded-full" style={{ color: colorFabi }}>{etqSeleccionadas.length}</span>
                      )}
                    </button>
                  </div>

                  {/* Etiquetas desplegadas */}
                  {etqAbierta && (
                    <div className="space-y-1">
                      <SelectBuscable
                        opciones={opcionesEtiquetas}
                        valor={item.etiquetas_ids[0] ?? ""}
                        onChange={(etqId) => toggleEtqItem(item.id ?? "", etqId)}
                        placeholder="Agregar etiqueta"
                        onCreateNuevo={onCrearEtiqueta}
                        labelNuevo="+ Etiqueta"
                        tamano="sm"
                      />
                      {item.etiquetas_ids.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {item.etiquetas_ids.map(etqId => {
                            const etq = etiquetas.find(e => e.id === etqId);
                            if (!etq) return null;
                            return (
                              <span key={etq.id} className="inline-flex items-center gap-0.5 font-label text-[8px] px-1.5 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                                #{etq.nombre}
                                <button
                                  type="button"
                                  onClick={() => toggleEtqItem(item.id ?? "", etq.id)}
                                  className="hover:text-on-surface transition-colors"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {!etqAbierta && etqSeleccionadas.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {etqSeleccionadas.map(etq => (
                        <span key={etq!.id} className="font-label text-[8px] px-1.5 py-0 rounded-full bg-surface-variant text-on-surface-variant">
                          #{etq!.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* "+ Item" button at the BOTTOM of the items list */}
          <button type="button" onClick={add}
            className="w-full h-10 rounded-lg border-2 border-dashed border-outline-variant/30 flex items-center justify-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:border-secondary hover:text-secondary hover:bg-secondary/5 transition-all active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Item
          </button>
        </div>

        {/* Opciones avanzadas */}
        <div className="flex justify-center">
          <button type="button" onClick={() => setMostrarAvanzadas(!mostrarAvanzadas)}
            className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/50 hover:text-on-surface-variant transition-colors underline underline-offset-2 decoration-outline-variant/30">
            {mostrarAvanzadas ? "Ocultar opciones" : "Opciones avanzadas"}
          </button>
        </div>
        {mostrarAvanzadas && (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3 space-y-2">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-outline">Pegado masivo</p>
            <textarea value={pegado} onChange={e => setPegado(e.target.value)} placeholder="Categoria - subcategoria - detalle - 7600+5200"
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2 font-headline text-sm text-on-surface outline-none resize-none placeholder:text-on-surface-variant/50 focus:border-b-primary" rows={3} />
            <button type="button" onClick={() => {
              const lineas = pegado.split("\n").filter(l => l.trim());
              if (!lineas.length) return;
              for (const linea of lineas) {
                const cols = linea.split("\t").map(c => c.trim()).filter(Boolean);
                const expr = cols.length >= 2 ? cols[cols.length - 1] : cols[0] ?? "";
                const desc = cols.length >= 2 ? cols[cols.length - 2] ?? "" : "";
                const subcat = cols.length >= 3 ? cols[cols.length - 3] ?? "" : "";
                const cat = cols.length >= 4 ? cols[cols.length - 4] ?? "" : "";
                const catId = encontrarCategoriaId(cat);
                const subId = encontrarSubcategoriaId(catId, subcat);
                const n = { ...itemVacio(compra.pagador_general), id: genId(), descripcion: desc, categoria_id: catId, subcategoria_id: subId, expresion_monto: expr };
                setCompra(a => ({ ...a, items: [...a.items, recalcular(n)] }));
              }
              setPegado("");
              toast.success(`${lineas.length} items cargados`);
            }}
              className="w-full h-8 rounded bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface hover:bg-surface-container-highest transition-colors">
              Cargar items
            </button>
          </div>
        )}
      </div>

      {/* Footer fijo con total y deuda clara */}
      <footer className="fixed bottom-[72px] left-0 right-0 z-20 bg-surface border-t border-outline-variant/15 px-4 py-3">
        <div className="mx-auto max-w-xl">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-label text-[10px] uppercase tracking-wider text-outline">Total</span>
            <span className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">{formatearPeso(total)}</span>
          </div>

          {/* Quien pago cuanto */}
          <div className="flex items-center justify-between">
            <span className="font-label tabular-nums" style={{ color: colorFran }}>{nombres.franco} pago {formatearPeso(totalFranco)}</span>
            <span className="font-label tabular-nums" style={{ color: colorFabi }}>{nombres.fabiola} pago {formatearPeso(totalFabiola)}</span>
          </div>

          {/* Deuda clara */}
          {debeFabiolaAFranco > 0 && (
            <p className="font-label text-xs tabular-nums text-center text-secondary">
              {nombres.fabiola} le debe {formatearPeso(debeFabiolaAFranco)} a {nombres.franco}
            </p>
          )}
          {debeFrancoAFabiola > 0 && (
            <p className="font-label text-xs tabular-nums text-center text-secondary">
              {nombres.franco} le debe {formatearPeso(debeFrancoAFabiola)} a {nombres.fabiola}
            </p>
          )}
          {debeFrancoAFabiola === 0 && debeFabiolaAFranco === 0 && total > 0 && (
            <p className="font-label text-xs text-center text-tertiary">A mano</p>
          )}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => guardar(true)} disabled={guardandoLocal}
              className="h-10 flex-1 rounded border border-outline-variant/30 bg-surface-container-high font-label text-[10px] font-bold uppercase tracking-wider text-on-surface disabled:opacity-50 hover:bg-surface-container-highest active:scale-[0.98] transition-all">
              Confirmar y nueva
            </button>
            <button type="button" onClick={() => guardar(false)} disabled={guardandoLocal}
              className="h-10 flex-[2] rounded bg-secondary font-label text-sm font-semibold uppercase tracking-wider text-on-secondary disabled:opacity-50 hover:bg-secondary/90 active:scale-[0.98] transition-all">
              {guardandoLocal ? "Guardando..." : "Confirmar Compra"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const FormularioCompra = FormularioCompraUnificado;
