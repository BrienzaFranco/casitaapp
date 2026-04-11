"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Calendar, ChevronDown, ChevronRight, Image as ImageIcon, Plus, Tag, Users, FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { fechaLocalISO, normalizarTexto } from "@/lib/utiles";
import { cargarMapaLugares, cargarMapaDetalles, predecirCategoria } from "@/lib/categorizacion";
import { parsearTextoLibre } from "@/lib/parseoRapido";
import { verificarLimites } from "@/lib/presupuesto";
import { registrarSyncPendiente } from "@/lib/sync";
import { usarConfiguracion } from "@/hooks/usarConfiguracion";
import { SelectBuscable } from "@/components/ui/SelectBuscable";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
  comprasHistoria?: Array<{ nombre_lugar: string; fecha?: string; items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }> }>;
  onCrearCategoria?: (nombre: string) => Promise<string | null>;
  onCrearEtiqueta?: (nombre: string) => Promise<string | null>;
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

function crearCompraInicial(def: string, inicial?: CompraEditable | null, historia: Array<{ nombre_lugar: string; fecha?: string; items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }> }> = []): CompraEditable {
  if (inicial) { guardarRegistradoPor(inicial.registrado_por); return { ...inicial, estado: inicial.estado ?? "confirmada", pagador_general: inicial.pagador_general ?? "compartido", etiquetas_compra_ids: inicial.etiquetas_compra_ids ?? [], items: (inicial.items.length ? inicial.items : [itemVacio("compartido")]).map(i => ({ ...i, id: i.id ?? genId(), etiquetas_ids: i.etiquetas_ids ?? [] })) }; }
  const reg = obtenerRegistradoPor() || def;
  guardarRegistradoPor(reg);
  // Use the last purchase's date if available, otherwise today
  const ultimaFecha = historia.length > 0 && historia[0].fecha ? historia[0].fecha : hoy();
  return { fecha: ultimaFecha, nombre_lugar: "", notas: "", registrado_por: reg, estado: "confirmada", pagador_general: "compartido", etiquetas_compra_ids: [], items: [itemVacio("compartido")] };
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

export function FormularioCompraUnificado({ categorias, subcategorias, etiquetas, nombres, registradoPorDefecto, compraInicial, onGuardar, comprasHistoria = [], onCrearCategoria, onCrearEtiqueta }: Props) {
  const config = usarConfiguracion();
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial, comprasHistoria));
  const [notas, setNotas] = useState(compraInicial?.notas ?? "");
  const [mostrarNotas, setMostrarNotas] = useState(!!compraInicial?.notas);
  const [mostrarAvanzadas, setMostrarAvanzadas] = useState(false);
  const [mostrarEtiquetasCompra, setMostrarEtiquetasCompra] = useState(false);
  const [nuevaEtiquetaInput, setNuevaEtiquetaInput] = useState("");
  const [pegado, setPegado] = useState("");
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [etiquetasAbiertas, setEtiquetasAbiertas] = useState<Record<string, boolean>>({});
  const [inputRapido, setInputRapido] = useState("");
  const [imagenComprobante, setImagenComprobante] = useState<string>("");
  const [mostrarRapido, setMostrarRapido] = useState(false);
  const ref = useRef<Map<string, HTMLInputElement | null>>(new Map());

  const total = useMemo(() => compra.items.reduce((a, i) => a + i.monto_resuelto, 0), [compra.items]);
  const totalFranco = useMemo(() => compra.items.reduce((a, i) => a + i.pago_franco, 0), [compra.items]);
  const totalFabiola = useMemo(() => compra.items.reduce((a, i) => a + i.pago_fabiola, 0), [compra.items]);
  const mapaLugaresMap = useMemo(() => cargarMapaLugares(comprasHistoria), [comprasHistoria]);
  const mapaLugares = useMemo(() => [...mapaLugaresMap.keys()], [mapaLugaresMap]);
  const mapaDetalles = useMemo(() => cargarMapaDetalles(comprasHistoria), [comprasHistoria]);

  useEffect(() => { if (!compraInicial && registradoPorDefecto && !compra.registrado_por) { setCompra(a => ({ ...a, registrado_por: registradoPorDefecto })); guardarRegistradoPor(registradoPorDefecto); } }, [compra.registrado_por, compraInicial, registradoPorDefecto]);

  const subsPorCat = useMemo(() => { const m = new Map<string, Subcategoria[]>(); for (const s of subcategorias) { const a = m.get(s.categoria_id) ?? []; a.push(s); m.set(s.categoria_id, a); } return m; }, [subcategorias]);

  const colorFran = config.colores.franco;
  const colorFabi = config.colores.fabiola;

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

      // Verificar limites de presupuesto
      const alertas = verificarLimites(items, categorias);
      if (alertas.length > 0) {
        const excedidas = alertas.filter(a => a.tipo === "excedido");
        const advertencias = alertas.filter(a => a.tipo === "advertencia");
        if (excedidas.length > 0) {
          toast.warning(`Te pasaste del limite en: ${excedidas.map(a => a.categoria).join(", ")}`, { duration: 5000 });
        }
        if (advertencias.length > 0) {
          toast.info(`Cerca del limite en: ${advertencias.map(a => a.categoria).join(", ")}`, { duration: 4000 });
        }
      }

      // Agregar imagen a notas si existe
      const notasFinal = imagenComprobante ? `${notas}\n\n[img:${imagenComprobante}]` : notas;

      await onGuardar({ ...compra, notas: notasFinal, estado: "confirmada", items });
      registrarSyncPendiente();
      if (limpia) {
        setCompra({ ...crearCompraInicial(registradoPorDefecto, null, comprasHistoria), fecha: compra.fecha, pagador_general: compra.pagador_general, registrado_por: compra.registrado_por });
        setImagenComprobante("");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setGuardandoLocal(false); }
  }

  // Parseo rapido de texto libre
  function procesarInputRapido() {
    const resultado = parsearTextoLibre(inputRapido);
    if (!resultado) return;

    // Si hay monto, agregar un item
    if (resultado.monto > 0) {
      const nuevo = { ...itemVacio(compra.pagador_general), id: genId() };
      nuevo.descripcion = resultado.detalle || resultado.lugar || "";
      nuevo.expresion_monto = inputRapido.match(/[\d]+[+\-*/\d.,\s]*$/)?.[0]?.trim() || String(resultado.monto);

      // Intentar predecir categoria por lugar
      if (resultado.lugar) {
        const pred = predecirCategoria(resultado.lugar, mapaLugaresMap, mapaDetalles);
        if (pred) {
          nuevo.categoria_id = pred.categoria_id;
          nuevo.subcategoria_id = pred.subcategoria_id;
        }
      }

      if (!compra.nombre_lugar && resultado.lugar) {
        set({ nombre_lugar: resultado.lugar });
      }

      setCompra(a => ({ ...a, items: [...a.items, recalcular(nuevo)] }));
      setInputRapido("");
      toast.success(`Item agregado: ${formatearPeso(resultado.monto)}`);
    }
  }

  // Cargar imagen
  function cargarImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setImagenComprobante(ev.target.result as string);
        toast.success("Imagen cargada");
      }
    };
    reader.readAsDataURL(file);
  }

  // Quien pago mas del otro
  // Calcular cuánto pagó realmente cada uno en esta compra
  const francoPagoReal = compra.pagador_general === "franco" ? total : (compra.pagador_general === "compartido" ? totalFranco : 0);

  // Balance = Lo que pagó - Lo que le correspondía pagar
  const balanceFranco = francoPagoReal - totalFranco;

  // Si el balance es positivo, Franco pagó de más (Fabiola le debe). Si es negativo, Franco pagó de menos (él le debe a Fabiola).
  const debeFabiolaAFranco = balanceFranco > 0.01 ? balanceFranco : 0;
  const debeFrancoAFabiola = balanceFranco < -0.01 ? Math.abs(balanceFranco) : 0;

  // Options for tags SelectBuscable
  const opcionesEtiquetas = useMemo(() => {
    return etiquetas.map(e => ({
      valor: e.id,
      etiqueta: e.nombre,
      color: e.color,
    }));
  }, [etiquetas]);

  return (
    <div className="min-h-screen bg-surface pb-32 md:pb-8">
      <div className="mx-auto max-w-xl px-4 pt-4 space-y-3">
        {/* Header: Lugar + Fecha + Pago en linea */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-4 space-y-3">
          {/* Lugar con sugerencias */}
          <input
            type="text" value={compra.nombre_lugar}
            onChange={e => set({ nombre_lugar: e.target.value })}
            placeholder="Comercio (ej: Coto Palermo)"
            list="lugares-sugeridos"
            className="w-full bg-transparent border-b-2 border-dashed border-outline-variant/30 px-0 py-2 font-headline text-2xl font-bold tracking-tight text-on-surface outline-none placeholder:text-on-surface-variant/30 focus:border-primary"
          />
          <datalist id="lugares-sugeridos">
            {mapaLugares.length > 0 && [...mapaLugares].slice(0, 20).map(l => (
              <option key={l} value={l} />
            ))}
          </datalist>

          {/* Fecha + Pago en misma linea */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-on-surface-variant" />
              <input id="compra-fecha" type="date" value={compra.fecha} onChange={e => set({ fecha: e.target.value })}
                className="h-7 rounded bg-surface-container-low px-2 font-label text-xs tabular-nums text-on-surface outline-none" />
            </label>
            <label className="flex items-center gap-1.5 shrink-0">
              <Users className="h-3.5 w-3.5 text-on-surface-variant" />
              <select id="compra-pagador" value={compra.pagador_general} onChange={e => set({ pagador_general: e.target.value as "franco" | "fabiola" | "compartido" })}
                className="h-7 rounded bg-surface-container-low px-2 font-label text-xs text-on-surface outline-none">
                <option value="compartido">50/50</option>
                <option value="franco">{nombres.franco}</option>
                <option value="fabiola">{nombres.fabiola}</option>
              </select>
            </label>
          </div>

          {/* Notas toggle */}
          <button type="button" onClick={() => setMostrarNotas(!mostrarNotas)}
            aria-label={mostrarNotas ? "Ocultar notas" : "Mostrar notas"}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <FileText className="h-3.5 w-3.5" />
            {mostrarNotas && <ChevronDown className={`h-3.5 w-3.5 transition-transform rotate-180`} />}
          </button>
          {mostrarNotas && (
            <textarea id="compra-notas" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas..."
              className="w-full bg-surface-container-low border-b border-outline/20 px-0 py-2 font-headline text-sm text-on-surface outline-none resize-none placeholder:text-on-surface-variant/50 focus:border-b-primary" rows={2} />
          )}

          {/* Etiquetas de compra - Colapsable */}
          <div className="pt-1 border-t border-outline-variant/10">
            <button
              type="button"
              onClick={() => setMostrarEtiquetasCompra(!mostrarEtiquetasCompra)}
              aria-label={mostrarEtiquetasCompra ? "Ocultar etiquetas" : "Mostrar etiquetas"}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              {compra.etiquetas_compra_ids.length > 0 && (
                <span className="font-label text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-on-secondary">
                  {compra.etiquetas_compra_ids.length}
                </span>
              )}
            </button>

            {/* Etiquetas seleccionadas preview (cuando esta cerrado) */}
            {!mostrarEtiquetasCompra && compra.etiquetas_compra_ids.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                {compra.etiquetas_compra_ids.map(id => {
                  const etq = etiquetas.find(e => e.id === id);
                  if (!etq) return null;
                  return (
                    <span key={etq.id} className="font-label text-[8px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">
                      #{etq.nombre}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Panel expandido */}
            {mostrarEtiquetasCompra && (
              <div className="mt-2 pl-5 space-y-2">
                {/* Etiquetas existentes */}
                <div className="flex flex-wrap gap-1">
                  {etiquetas.map(etq => (
                    <button
                      key={etq.id}
                      type="button"
                      onClick={() => toggleEtqCompra(etq.id)}
                      className={`font-label text-[9px] px-2 py-1 rounded-full transition-colors ${
                        compra.etiquetas_compra_ids.includes(etq.id)
                          ? "bg-secondary text-on-secondary"
                          : "bg-surface-variant text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      #{etq.nombre}
                    </button>
                  ))}
                </div>

                {/* Agregar nueva etiqueta */}
                {onCrearEtiqueta && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nuevaEtiquetaInput}
                      onChange={e => setNuevaEtiquetaInput(e.target.value.toUpperCase())}
                      onKeyDown={async e => {
                        if (e.key === "Enter" && nuevaEtiquetaInput.trim()) {
                          e.preventDefault();
                          const nuevoId = await onCrearEtiqueta(nuevaEtiquetaInput.trim());
                          if (nuevoId) {
                            toggleEtqCompra(nuevoId);
                            setNuevaEtiquetaInput("");
                          }
                        }
                      }}
                      placeholder="Nueva etiqueta..."
                      className="flex-1 h-7 bg-surface-container-low rounded px-2 font-label text-[10px] text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-secondary"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (nuevaEtiquetaInput.trim()) {
                          const nuevoId = await onCrearEtiqueta(nuevaEtiquetaInput.trim());
                          if (nuevoId) {
                            toggleEtqCompra(nuevoId);
                            setNuevaEtiquetaInput("");
                          }
                        }
                      }}
                      className="h-7 px-2 rounded bg-secondary/20 text-secondary font-label text-[9px] font-bold hover:bg-secondary/30 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input rapido colapsable */}
        {mostrarRapido && (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="input-rapido"
                value={inputRapido}
                onChange={e => setInputRapido(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); procesarInputRapido(); } }}
                placeholder='Ej: "Cena en Coto 15000" o "Yerba 2500"'
                className="flex-1 h-9 rounded bg-surface-container-low px-3 font-label text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-secondary"
                autoFocus
              />
              <button
                type="button"
                onClick={procesarInputRapido}
                disabled={!inputRapido.trim()}
                className="h-9 px-3 rounded bg-secondary text-on-secondary font-label text-[10px] font-bold uppercase disabled:opacity-40 hover:bg-secondary/90 transition-colors"
              >
                Agregar
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="h-7 w-7 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors flex items-center justify-center" aria-label="Tomar foto">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" name="foto-camara" accept="image/*" capture="environment" onChange={cargarImagen} className="hidden" />
              </label>
              <label className="h-7 w-7 rounded bg-surface-container text-on-surface-variant hover:bg-surface-container-high cursor-pointer transition-colors flex items-center justify-center" aria-label="Subir imagen">
                <ImageIcon className="h-3.5 w-3.5" />
                <input type="file" name="foto-galeria" accept="image/*" onChange={cargarImagen} className="hidden" />
              </label>
              {imagenComprobante && (
                <div className="flex items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagenComprobante} alt="Comprobante" className="h-7 w-7 rounded object-cover" />
                  <button type="button" onClick={() => setImagenComprobante("")} className="text-error hover:text-error/80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex items-center justify-between">
          <span className="font-label text-[10px] font-bold uppercase tracking-wider text-outline">Items ({compra.items.length})</span>
          <button
            type="button"
            onClick={() => setMostrarRapido(!mostrarRapido)}
            aria-label={mostrarRapido ? "Cerrar input rapido" : "Abrir input rapido"}
            className={`h-7 w-7 rounded flex items-center justify-center transition-colors ${mostrarRapido ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {compra.items.map((item, index) => {
            const etqAbierta = etiquetasAbiertas[item.id ?? ""];
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
                {/* Header: Item number badge + descripcion editable + eliminar */}
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-surface-variant font-label text-[9px] font-bold text-on-surface-variant shrink-0">
                      {index + 1}
                    </span>
                    <input
                      ref={el => { if (el && !item.descripcion) ref.current.set(item.id ?? "", el); }}
                      type="text" value={item.descripcion}
                      onChange={e => {
                        setItem(item.id ?? "", { descripcion: e.target.value });
                        if (!item.categoria_id && e.target.value.length >= 4) {
                          const pred = predecirCategoria(e.target.value, mapaLugaresMap, mapaDetalles);
                          if (pred) setItem(item.id ?? "", { categoria_id: pred.categoria_id, subcategoria_id: pred.subcategoria_id });
                        }
                      }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                      placeholder="Que compraste?"
                      className="flex-1 min-w-0 bg-transparent border-none px-0 py-0 font-headline text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/40"
                    />
                    <button type="button" onClick={() => del(item.id ?? "")}
                      className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-error hover:bg-error-container/30 transition-colors shrink-0"
                      title="Eliminar">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Monto inline */}
                  <div className="flex items-center gap-2 pl-7">
                    <span className="font-label text-[10px] text-on-surface-variant/60 shrink-0">$</span>
                    <input type="text" inputMode="decimal" value={item.expresion_monto}
                      onChange={e => setItem(item.id ?? "", { expresion_monto: e.target.value })}
                      onBlur={() => setItem(item.id ?? "", {}, true)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                      placeholder="200+200"
                      className="flex-1 bg-transparent border-b border-outline/20 px-0 py-0.5 font-label text-xs tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant/40 focus:border-b-primary" />
                    <span className="font-label text-base font-bold tabular-nums text-primary shrink-0">{formatearPeso(item.monto_resuelto)}</span>
                  </div>
                </div>

                {/* Seccion inferior: Categoria y Corresponde */}
                <div className="px-3 pb-2.5 space-y-2 border-t border-outline-variant/10 pt-2">
                  {/* Categoria + Subcategoria con jerarquia visual */}
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      <SelectBuscable
                        opciones={opcionesCategorias}
                        valor={item.categoria_id}
                        onChange={(catId) => setItem(item.id ?? "", { categoria_id: catId, subcategoria_id: "" })}
                        placeholder="Categoria"
                        onCreateNuevo={onCrearCategoria}
                        labelNuevo="+ Categoria"
                      />
                    </div>
                    {item.categoria_id && subOpciones.length > 0 && (
                      <>
                        <ChevronRight className="h-3 w-3 text-on-surface-variant/40 shrink-0" />
                        <div className="flex-1">
                          <SelectBuscable
                            opciones={subOpciones}
                            valor={item.subcategoria_id}
                            onChange={(subId) => setItem(item.id ?? "", { subcategoria_id: subId })}
                            placeholder="Subcat"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Corresponde a: Chips de seleccion */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant/50 shrink-0">Corresp:</span>
                      <div className="inline-flex rounded-full bg-surface-container p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => setItem(item.id ?? "", { tipo_reparto: "solo_franco" }, true)}
                          className={`h-6 px-2.5 rounded-full font-label text-[9px] font-medium transition-all ${
                            item.tipo_reparto === "solo_franco"
                              ? "text-on-primary shadow-sm"
                              : "text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                          style={item.tipo_reparto === "solo_franco" ? { backgroundColor: colorFran } : {}}
                        >
                          {nombres.franco}
                        </button>
                        <button
                          type="button"
                          onClick={() => setItem(item.id ?? "", { tipo_reparto: "50/50" }, true)}
                          className={`h-6 px-2.5 rounded-full font-label text-[9px] font-medium transition-all ${
                            item.tipo_reparto === "50/50"
                              ? "bg-secondary text-on-secondary shadow-sm"
                              : "text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                        >
                          50/50
                        </button>
                        <button
                          type="button"
                          onClick={() => setItem(item.id ?? "", { tipo_reparto: "solo_fabiola" }, true)}
                          className={`h-6 px-2.5 rounded-full font-label text-[9px] font-medium transition-all ${
                            item.tipo_reparto === "solo_fabiola"
                              ? "text-on-primary shadow-sm"
                              : "text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                          style={item.tipo_reparto === "solo_fabiola" ? { backgroundColor: colorFabi } : {}}
                        >
                          {nombres.fabiola}
                        </button>
                      </div>
                    </div>

                    {/* Etiquetas toggle */}
                    <button type="button" aria-label="Etiquetas del item" onClick={() => setEtiquetasAbiertas(a => ({ ...a, [item.id ?? ""]: !a[item.id ?? ""] }))}
                      className={`flex items-center gap-1 h-6 px-2 rounded-full font-label text-[9px] transition-colors shrink-0 ${
                        etqSeleccionadas.length > 0
                          ? "bg-tertiary/15 text-tertiary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}>
                      <Tag className="h-3 w-3" />
                      {etqSeleccionadas.length > 0 && (
                        <span className="font-bold">{etqSeleccionadas.length}</span>
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
          <button type="button" aria-label="Opciones avanzadas de importacion" onClick={() => setMostrarAvanzadas(!mostrarAvanzadas)}
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

      {/* Footer con total y deuda */}
      <footer className="sticky bottom-0 md:relative md:bottom-auto bg-surface border-t border-outline-variant/15 md:border md:rounded-lg px-4 py-3 md:shadow-sm">
        <div className="mx-auto max-w-xl">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-label text-[10px] uppercase tracking-wider text-outline">Total</span>
            <span className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary">{formatearPeso(total)}</span>
          </div>

          {/* Quien pago (segun dropdown) vs Corresponde */}
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="font-label text-[10px] text-on-surface-variant">
              {compra.pagador_general === "franco"
                ? `${nombres.franco} pago todo`
                : compra.pagador_general === "fabiola"
                  ? `${nombres.fabiola} pago todo`
                  : "Ambos pagaron"}
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              Corresp: {nombres.franco} {formatearPeso(totalFranco)} / {nombres.fabiola} {formatearPeso(totalFabiola)}
            </span>
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
