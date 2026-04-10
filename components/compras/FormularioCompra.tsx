"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { fechaLocalISO, normalizarTexto } from "@/lib/utiles";
import { cargarMapaLugares, cargarMapaDetalles, predecirCategoria } from "@/lib/categorizacion";
import { Combobox } from "@/components/ui/Combobox";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  guardando?: boolean;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
  onCrearSubcategoria?: (input: Pick<Subcategoria, "categoria_id" | "nombre" | "limite_mensual">) => Promise<Subcategoria>;
  comprasHistoria?: Array<{
    nombre_lugar: string;
    items: Array<{ descripcion: string; categoria_id: string | null; subcategoria_id: string | null }>;
  }>;
}

function hoy() {
  return fechaLocalISO();
}

function generarIdTemporal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tmp-${crypto.randomUUID()}`;
  }

  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function repartoDesdePagador(pagador: CompraEditable["pagador_general"]): TipoReparto {
  if (pagador === "franco") {
    return "solo_franco";
  }
  if (pagador === "fabiola") {
    return "solo_fabiola";
  }
  return "50/50";
}

function crearItemVacio(pagadorGeneral: CompraEditable["pagador_general"]): ItemEditable {
  const tipoReparto = repartoDesdePagador(pagadorGeneral);
  const reparto = calcularReparto(tipoReparto, 0, 0, 0);

  return {
    id: generarIdTemporal(),
    descripcion: "",
    categoria_id: "",
    subcategoria_id: "",
    expresion_monto: "",
    monto_resuelto: 0,
    tipo_reparto: tipoReparto,
    pago_franco: reparto.pago_franco,
    pago_fabiola: reparto.pago_fabiola,
    etiquetas_ids: [],
  };
}

function normalizarItemsIniciales(items: ItemEditable[], pagadorGeneral: CompraEditable["pagador_general"]) {
  if (!items.length) {
    return [crearItemVacio(pagadorGeneral)];
  }

  return items.map((item) => ({
    ...item,
    id: item.id ?? generarIdTemporal(),
    etiquetas_ids: item.etiquetas_ids ?? [],
  }));
}

function crearCompraInicial(registradoPorDefecto: string, compraInicial?: CompraEditable | null): CompraEditable {
  if (compraInicial) {
    guardarRegistradoPor(compraInicial.registrado_por);
    return {
      ...compraInicial,
      estado: compraInicial.estado ?? "confirmada",
      pagador_general: compraInicial.pagador_general ?? "compartido",
      etiquetas_compra_ids: compraInicial.etiquetas_compra_ids ?? [],
      items: normalizarItemsIniciales(compraInicial.items, compraInicial.pagador_general ?? "compartido"),
    };
  }

  const registradoPor = obtenerRegistradoPor() || registradoPorDefecto;
  guardarRegistradoPor(registradoPor);

  return {
    fecha: hoy(),
    nombre_lugar: "",
    notas: "",
    registrado_por: registradoPor,
    estado: "confirmada",
    pagador_general: "compartido",
    etiquetas_compra_ids: [],
    items: [crearItemVacio("compartido")],
  };
}

function recalcularItem(item: ItemEditable) {
  let monto = item.monto_resuelto;
  const expresion = item.expresion_monto.trim();

  if (expresion) {
    try {
      monto = evaluarExpresion(expresion);
    } catch {
      // Se valida al confirmar.
    }
  } else {
    monto = 0;
  }

  const reparto = calcularReparto(item.tipo_reparto, monto, item.pago_franco, item.pago_fabiola);
  return {
    ...item,
    expresion_monto: expresion,
    monto_resuelto: monto,
    pago_franco: reparto.pago_franco,
    pago_fabiola: reparto.pago_fabiola,
  };
}

function normalizarItemsParaGuardar(items: ItemEditable[]) {
  const filasConContenido = items.filter(
    (item) =>
      item.descripcion.trim() ||
      item.categoria_id ||
      item.subcategoria_id ||
      item.expresion_monto.trim() ||
      item.etiquetas_ids.length,
  );

  if (!filasConContenido.length) {
    return [] as ItemEditable[];
  }

  return filasConContenido.map((item) => {
    if (!item.expresion_monto.trim()) {
      throw new Error("Cada item necesita expresion de monto.");
    }

    const montoResuelto = evaluarExpresion(item.expresion_monto);
    const reparto = calcularReparto(item.tipo_reparto, montoResuelto, item.pago_franco, item.pago_fabiola);

    return {
      ...item,
      monto_resuelto: montoResuelto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
    };
  });
}

interface LineaParseada {
  categoria: string;
  subcategoria: string;
  descripcion: string;
  expresion: string;
}

function parsearLineaLibre(linea: string): LineaParseada | null {
  const limpia = linea.trim();
  if (!limpia) {
    return null;
  }

  const columnas = limpia.split("\t").map((valor) => valor.trim()).filter(Boolean);
  if (columnas.length >= 2) {
    const expresion = columnas[columnas.length - 1] ?? "";
    const descripcion = columnas[columnas.length - 2] ?? "";
    const subcategoria = columnas.length > 2 ? columnas[columnas.length - 3] ?? "" : "";
    const categoria = columnas.length > 3 ? columnas[columnas.length - 4] ?? "" : "";

    return {
      categoria,
      subcategoria,
      descripcion,
      expresion,
    };
  }

  const partes = limpia.split("-").map((valor) => valor.trim()).filter(Boolean);
  if (partes.length >= 2) {
    const expresion = partes[partes.length - 1] ?? "";
    const descripcion = partes[partes.length - 2] ?? "";
    const subcategoria = partes.length > 2 ? partes[partes.length - 3] ?? "" : "";
    const categoria = partes.length > 3 ? partes[partes.length - 4] ?? "" : "";

    return {
      categoria,
      subcategoria,
      descripcion,
      expresion,
    };
  }

  return {
    categoria: "",
    subcategoria: "",
    descripcion: limpia,
    expresion: "",
  };
}

function encontrarCategoriaId(categorias: Categoria[], nombre: string) {
  const base = normalizarTexto(nombre);
  if (!base) {
    return "";
  }

  const exacta = categorias.find((categoria) => normalizarTexto(categoria.nombre) === base);
  if (exacta) {
    return exacta.id;
  }

  const aproximada = categorias.find((categoria) => normalizarTexto(categoria.nombre).includes(base));
  return aproximada?.id ?? "";
}

function encontrarSubcategoriaId(
  subcategorias: Subcategoria[],
  categoriaId: string,
  nombre: string,
) {
  const base = normalizarTexto(nombre);
  if (!base) {
    return "";
  }

  const candidatas = categoriaId
    ? subcategorias.filter((subcategoria) => subcategoria.categoria_id === categoriaId)
    : subcategorias;

  const exacta = candidatas.find((subcategoria) => normalizarTexto(subcategoria.nombre) === base);
  if (exacta) {
    return exacta.id;
  }

  const aproximada = candidatas.find((subcategoria) => normalizarTexto(subcategoria.nombre).includes(base));
  return aproximada?.id ?? "";
}

function encontrarEtiquetaIdPorNombre(etiquetas: Etiqueta[], nombre: string) {
  const base = normalizarTexto(nombre);
  if (!base) {
    return "";
  }

  const exacta = etiquetas.find((etiqueta) => normalizarTexto(etiqueta.nombre) === base);
  return exacta?.id ?? "";
}

export function FormularioCompraUnificado({
  categorias,
  subcategorias,
  etiquetas,
  nombres,
  registradoPorDefecto,
  compraInicial,
  guardando = false,
  onGuardar,
  comprasHistoria = [],
}: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [mostrarNotas, setMostrarNotas] = useState(Boolean(compraInicial?.notas));
  const [entradaPegado, setEntradaPegado] = useState("");
  const [mostrarPegadoMasivo, setMostrarPegadoMasivo] = useState(false);
  const [entradaEtiquetaCompra, setEntradaEtiquetaCompra] = useState("");
  const [entradaEtiquetaItem, setEntradaEtiquetaItem] = useState<Record<string, string>>({});
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const guardandoCompra = guardando || guardandoLocal;
  const ultimosInputsRef = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const [filaActiva, setFilaActiva] = useState<string | null>(null);

  const total = useMemo(() => compra.items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0), [compra.items]);

  const mapaLugares = useMemo(
    () => cargarMapaLugares(comprasHistoria),
    [comprasHistoria],
  );
  const mapaDetalles = useMemo(
    () => cargarMapaDetalles(comprasHistoria),
    [comprasHistoria],
  );

  useEffect(() => {
    if (!compraInicial && registradoPorDefecto && !compra.registrado_por) {
      setCompra((anterior) => ({ ...anterior, registrado_por: registradoPorDefecto }));
      guardarRegistradoPor(registradoPorDefecto);
    }
  }, [compra.registrado_por, compraInicial, registradoPorDefecto]);

  const opcionesSubcategoriaPorCategoria = useMemo(() => {
    const mapa = new Map<string, Subcategoria[]>();
    for (const subcategoria of subcategorias) {
      const actuales = mapa.get(subcategoria.categoria_id) ?? [];
      actuales.push(subcategoria);
      mapa.set(subcategoria.categoria_id, actuales);
    }
    return mapa;
  }, [subcategorias]);

  function actualizarCampo<K extends keyof CompraEditable>(campo: K, valor: CompraEditable[K]) {
    setCompra((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function actualizarItem(id: string, cambios: Partial<ItemEditable>, recalcular = false) {
    setCompra((anterior) => ({
      ...anterior,
      items: anterior.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const siguiente = { ...item, ...cambios };
        return recalcular ? recalcularItem(siguiente) : siguiente;
      }),
    }));
  }

  function agregarFila(base?: Partial<ItemEditable>) {
    const nuevo = {
      ...crearItemVacio(compra.pagador_general),
      ...base,
      id: generarIdTemporal(),
      etiquetas_ids: base?.etiquetas_ids ?? [],
    } satisfies ItemEditable;

    ultimosInputsRef.current.set(nuevo.id, null);

    setCompra((anterior) => ({
      ...anterior,
      items: [...anterior.items, recalcularItem(nuevo)],
    }));

    queueMicrotask(() => {
      const inputRef = ultimosInputsRef.current.get(nuevo.id);
      if (inputRef) {
        inputRef.focus();
      }
    });
  }

  function duplicarFila(id: string) {
    const fila = compra.items.find((item) => item.id === id);
    if (!fila) {
      return;
    }

    agregarFila({
      ...fila,
      id: undefined,
      descripcion: fila.descripcion ? `${fila.descripcion} copia` : "",
    });
  }

  function eliminarFila(id: string) {
    setCompra((anterior) => {
      const siguientes = anterior.items.filter((item) => item.id !== id);
      return {
        ...anterior,
        items: siguientes.length ? siguientes : [crearItemVacio(anterior.pagador_general)],
      };
    });
  }

  function toggleEtiquetaCompra(etiquetaId: string) {
    setCompra((anterior) => {
      const existe = anterior.etiquetas_compra_ids.includes(etiquetaId);
      return {
        ...anterior,
        etiquetas_compra_ids: existe
          ? anterior.etiquetas_compra_ids.filter((id) => id !== etiquetaId)
          : [...anterior.etiquetas_compra_ids, etiquetaId],
      };
    });
  }

  function toggleEtiquetaItem(itemId: string, etiquetaId: string) {
    setCompra((anterior) => ({
      ...anterior,
      items: anterior.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        const existe = item.etiquetas_ids.includes(etiquetaId);
        return {
          ...item,
          etiquetas_ids: existe
            ? item.etiquetas_ids.filter((id) => id !== etiquetaId)
            : [...item.etiquetas_ids, etiquetaId],
        };
      }),
    }));
  }

  function agregarEtiquetaCompraPorTexto(texto: string) {
    const etiquetaId = encontrarEtiquetaIdPorNombre(etiquetas, texto);
    if (!etiquetaId) {
      toast.error("Etiqueta no encontrada. Elige una sugerencia existente.");
      return;
    }
    toggleEtiquetaCompra(etiquetaId);
    setEntradaEtiquetaCompra("");
  }

  function agregarEtiquetaItemPorTexto(itemId: string, texto: string) {
    const etiquetaId = encontrarEtiquetaIdPorNombre(etiquetas, texto);
    if (!etiquetaId) {
      toast.error("Etiqueta no encontrada. Elige una sugerencia existente.");
      return;
    }
    toggleEtiquetaItem(itemId, etiquetaId);
    setEntradaEtiquetaItem((anterior) => ({ ...anterior, [itemId]: "" }));
  }

  function importarLineasPegadas() {
    const lineas = entradaPegado.split("\n").map((linea) => parsearLineaLibre(linea)).filter(Boolean) as LineaParseada[];
    if (!lineas.length) {
      return;
    }

    const nuevasFilas = lineas.map((linea) => {
      const categoriaId = encontrarCategoriaId(categorias, linea.categoria);
      const subcategoriaId = encontrarSubcategoriaId(subcategorias, categoriaId, linea.subcategoria);
      return recalcularItem({
        ...crearItemVacio(compra.pagador_general),
        id: generarIdTemporal(),
        categoria_id: categoriaId,
        subcategoria_id: subcategoriaId,
        descripcion: linea.descripcion,
        expresion_monto: linea.expresion,
      });
    });

    setCompra((anterior) => {
      const base = anterior.items.filter(
        (item) =>
          item.descripcion.trim() ||
          item.expresion_monto.trim() ||
          item.categoria_id ||
          item.subcategoria_id ||
          item.etiquetas_ids.length,
      );

      return {
        ...anterior,
        items: [...base, ...nuevasFilas],
      };
    });

    setEntradaPegado("");
    toast.success(`${nuevasFilas.length} filas cargadas.`);
  }

  async function confirmarCompra(limpiarDespues = false) {
    try {
      setGuardandoLocal(true);
      const items = normalizarItemsParaGuardar(compra.items);

      if (!items.length) {
        toast.error("Agrega al menos un item antes de confirmar.");
        return;
      }

      const payload: CompraEditable = {
        ...compra,
        estado: "confirmada",
        items,
      };

      await onGuardar(payload);

      if (limpiarDespues) {
        setCompra({
          ...crearCompraInicial(registradoPorDefecto, null),
          fecha: compra.fecha,
          pagador_general: compra.pagador_general,
          registrado_por: compra.registrado_por,
        });
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar la compra.";
      toast.error(mensaje);
    } finally {
      setGuardandoLocal(false);
    }
  }

  const botonBase =
    "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-all duration-150 active:scale-[0.97]";
  const botonActivo = "bg-primary text-on-primary shadow-sm";
  const botonInactivo = "bg-surface-variant text-on-surface-variant hover:bg-surface-container-high";

  return (
    <div className="flex min-h-screen flex-col bg-surface pb-4 md:pb-24">
      <div className="mx-auto w-full max-w-[1160px] px-2 py-2 md:px-3 md:py-3">
        <div className="grid gap-2 md:gap-3 lg:grid-cols-[330px_1fr]">
          <section className="space-y-2">
            {/* Header Card */}
            <div className="rounded-xl bg-surface-container-lowest p-3 md:p-4 shadow-sm">
              <input
                type="text"
                value={compra.nombre_lugar}
                onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
                placeholder="Comercio"
                className="mb-3 w-full border-b border-transparent bg-transparent px-0 py-2 font-headline text-2xl font-semibold tracking-tight text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                <label className={`${botonBase} ${botonInactivo} cursor-pointer`}>
                  <span className="font-label text-[10px] uppercase tracking-widest">Fecha</span>
                  <input
                    type="date"
                    value={compra.fecha}
                    onChange={(event) => actualizarCampo("fecha", event.target.value)}
                    className="border-none bg-transparent p-0 font-label text-sm tabular-nums text-on-surface outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "franco")}
                  className={`${botonBase} ${compra.pagador_general === "franco" ? botonActivo : botonInactivo}`}
                >
                  {nombres.franco}
                </button>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "fabiola")}
                  className={`${botonBase} ${compra.pagador_general === "fabiola" ? botonActivo : botonInactivo}`}
                >
                  {nombres.fabiola}
                </button>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "compartido")}
                  className={`${botonBase} ${compra.pagador_general === "compartido" ? botonActivo : botonInactivo}`}
                >
                  Compartido
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarNotas((actual) => !actual)}
                  className={`${botonBase} ${mostrarNotas || compra.notas.trim() ? botonActivo : botonInactivo}`}
                >
                  Notas
                </button>
              </div>

              {mostrarNotas ? (
                <textarea
                  value={compra.notas}
                  onChange={(event) => actualizarCampo("notas", event.target.value)}
                  placeholder="Notas libres de la compra"
                  className="mt-3 min-h-24 w-full border-b border-transparent bg-transparent px-0 py-2 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                />
              ) : null}

              <div className="mt-3">
                <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Etiquetas de compra</p>
                <input
                  list="etiquetas-sugeridas-compra"
                  value={entradaEtiquetaCompra}
                  onChange={(event) => setEntradaEtiquetaCompra(event.target.value)}
                  onFocus={(event) => event.currentTarget.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      agregarEtiquetaCompraPorTexto(entradaEtiquetaCompra);
                    }
                  }}
                  placeholder="Escribe y elige etiqueta"
                  className="h-9 w-full border-b border-transparent bg-transparent px-0 py-1.5 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                />
                <datalist id="etiquetas-sugeridas-compra">
                  {etiquetas.map((etiqueta) => (
                    <option key={etiqueta.id} value={etiqueta.nombre} />
                  ))}
                </datalist>
                <div className="mt-2 flex flex-wrap gap-1">
                  {compra.etiquetas_compra_ids.map((etiquetaId) => {
                    const etiqueta = etiquetas.find((actual) => actual.id === etiquetaId);
                    if (!etiqueta) {
                      return null;
                    }
                    return (
                      <button
                        key={etiqueta.id}
                        type="button"
                        onClick={() => toggleEtiquetaCompra(etiqueta.id)}
                        className="inline-flex h-6 items-center rounded-full bg-surface-variant px-2 font-label text-[10px] font-medium text-on-surface-variant transition-all duration-150 hover:bg-surface-container-high"
                        title="Quitar etiqueta"
                      >
                        {etiqueta.nombre} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Advanced Options Card */}
            <div className="rounded-xl bg-surface-container-lowest p-3 md:p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setMostrarPegadoMasivo((actual) => !actual)}
                className="flex w-full items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-left transition-all duration-150 hover:bg-surface-container"
              >
                <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Opciones avanzadas</span>
                <span className="font-label text-xs text-on-surface-variant">{mostrarPegadoMasivo ? "Ocultar" : "Mostrar"}</span>
              </button>
              {mostrarPegadoMasivo ? (
                <div className="mt-3">
                  <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pegado masivo</p>
                  <textarea
                    value={entradaPegado}
                    onChange={(event) => setEntradaPegado(event.target.value)}
                    placeholder={`Pega lineas: categoria - subcategoria - detalle - 7600+5200-500\nO columnas desde Sheets (TAB)`}
                    className="min-h-28 w-full border-b border-transparent bg-transparent px-0 py-2 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                  />
                  <button
                    type="button"
                    onClick={importarLineasPegadas}
                    className="mt-2 h-9 w-full rounded-lg bg-surface-container-high px-3 font-label text-sm font-medium text-on-surface transition-all duration-150 hover:bg-surface-container-highest active:scale-[0.98]"
                  >
                    Cargar lineas en tabla
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-3 py-2">
              <h3 className="font-headline text-sm font-semibold text-on-surface">Items</h3>
              <button
                type="button"
                onClick={() => agregarFila()}
                className="h-8 rounded-full bg-surface-container-high px-3 font-label text-xs font-medium text-on-surface-variant transition-all duration-150 hover:bg-surface-container-highest active:scale-[0.97]"
              >
                + Fila
              </button>
            </div>

            <div className="space-y-2 p-2 md:hidden">
              {compra.items.map((item) => (
                <article key={item.id} className="space-y-2 rounded-xl bg-surface-container-low p-2.5">
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(event) => actualizarItem(item.id as string, { descripcion: event.target.value })}
                    placeholder="Detalle"
                    className="h-10 w-full border-b border-transparent bg-transparent px-0 py-1 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.expresion_monto}
                      onChange={(event) => actualizarItem(item.id as string, { expresion_monto: event.target.value })}
                      onBlur={() => actualizarItem(item.id as string, {}, true)}
                      placeholder="Monto"
                      className="h-10 w-full border-b border-transparent bg-transparent px-0 py-1 font-label text-sm tabular-nums text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                    />
                    <button
                      type="button"
                      onClick={() => eliminarFila(item.id as string)}
                      className="h-10 rounded-full bg-surface-container-high px-3 font-label text-xs font-medium text-on-surface-variant transition-all duration-150 hover:bg-surface-container-highest"
                    >
                      Borrar
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => actualizarItem(item.id as string, { tipo_reparto: "50/50" }, true)}
                      className={`h-7 rounded-full px-2 font-label text-[10px] font-medium transition-all duration-150 ${item.tipo_reparto === "50/50" ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"}`}
                    >
                      50/50
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarItem(item.id as string, { tipo_reparto: "solo_franco" }, true)}
                      className={`h-7 rounded-full px-2 font-label text-[10px] font-medium transition-all duration-150 ${item.tipo_reparto === "solo_franco" ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"}`}
                    >
                      {nombres.franco}
                    </button>
                    <button
                      type="button"
                      onClick={() => actualizarItem(item.id as string, { tipo_reparto: "solo_fabiola" }, true)}
                      className={`h-7 rounded-full px-2 font-label text-[10px] font-medium transition-all duration-150 ${item.tipo_reparto === "solo_fabiola" ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"}`}
                    >
                      {nombres.fabiola}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table
                className="w-full min-w-[940px] border-collapse md:min-w-[1020px]"
                onPaste={(e) => {
                  const texto = e.clipboardData.getData("text");
                  e.preventDefault();
                  const lineas = texto.split("\n").filter((l) => l.trim());
                  for (const linea of lineas) {
                    const columnas = linea.split("\t").map((c) => c.trim());
                    if (columnas.length >= 2) {
                      const expresion = columnas[columnas.length - 1] ?? "";
                      const detalle = columnas.length >= 2 ? columnas[columnas.length - 2] : "";
                      agregarFila({ descripcion: detalle, expresion_monto: expresion });
                    } else if (columnas[0]) {
                      agregarFila({ descripcion: columnas[0] });
                    }
                  }
                  toast.success(`${lineas.length} filas importadas`);
                }}
              >
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-container text-left">
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Categoria</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Subcategoria</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Detalle</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Monto</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reparto</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Franco</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Fabiola</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Tags</th>
                    <th className="border-b border-outline-variant/20 px-2 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {compra.items.map((item) => {
                    const subcategoriasFila = item.categoria_id
                      ? opcionesSubcategoriaPorCategoria.get(item.categoria_id) ?? []
                      : [];

                    return (
                      <tr
                        key={item.id}
                        className={`align-top text-sm transition-all duration-150 ${
                          filaActiva === item.id ? "bg-surface-container-low" : filaActiva && filaActiva !== item.id ? "opacity-40" : ""
                        }`}
                        onFocus={() => setFilaActiva(item.id as string)}
                      >
                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <Combobox
                            valor={item.categoria_id}
                            onChange={(valor) =>
                              actualizarItem(item.id as string, {
                                categoria_id: valor,
                                subcategoria_id: "",
                              })
                            }
                            opciones={[
                              { valor: "", etiqueta: "-" },
                              ...categorias.map((c) => ({
                                valor: c.id,
                                etiqueta: c.nombre,
                              })),
                            ]}
                            placeholder="Buscar..."
                          />
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <Combobox
                            valor={item.subcategoria_id}
                            onChange={(valor) => actualizarItem(item.id as string, { subcategoria_id: valor })}
                            opciones={[
                              { valor: "", etiqueta: "-" },
                              ...subcategoriasFila.map((s) => ({
                                valor: s.id,
                                etiqueta: s.nombre,
                              })),
                            ]}
                            placeholder="Buscar..."
                          />
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(event) => {
                              const nuevoValor = event.target.value;
                              actualizarItem(item.id as string, { descripcion: nuevoValor });

                              if (!item.categoria_id && nuevoValor.length >= 4) {
                                const prediccion = predecirCategoria(nuevoValor, mapaLugares, mapaDetalles);
                                if (prediccion) {
                                  actualizarItem(item.id as string, {
                                    categoria_id: prediccion.categoria_id,
                                    subcategoria_id: prediccion.subcategoria_id,
                                  });
                                }
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                agregarFila();
                              }
                            }}
                            placeholder="-"
                            className="h-8 w-full border-b border-transparent bg-transparent px-1 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                          />
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.expresion_monto}
                              onChange={(event) => actualizarItem(item.id as string, { expresion_monto: event.target.value })}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  agregarFila();
                                }
                              }}
                              onBlur={() => actualizarItem(item.id as string, {}, true)}
                              placeholder="-"
                              className="h-8 w-full border-b border-transparent bg-transparent px-1 font-label text-sm tabular-nums text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                            />
                            {item.expresion_monto && item.expresion_monto !== item.monto_resuelto.toString() && (
                              <span className="absolute -bottom-3 left-0 font-label text-[10px] tabular-nums text-tertiary">
                                = {formatearPeso(item.monto_resuelto)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <select
                            value={item.tipo_reparto}
                            onChange={(event) =>
                              actualizarItem(item.id as string, { tipo_reparto: event.target.value as TipoReparto }, true)
                            }
                            className="h-8 w-full border-b border-transparent bg-transparent px-1 font-label text-[10px] text-on-surface outline-none transition-all duration-150 focus:border-b-primary"
                          >
                            <option value="50/50">50/50</option>
                            <option value="solo_franco">{nombres.franco}</option>
                            <option value="solo_fabiola">{nombres.fabiola}</option>
                            <option value="personalizado">Custom</option>
                          </select>
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.pago_franco}
                            onChange={(event) =>
                              actualizarItem(
                                item.id as string,
                                { pago_franco: Number(event.target.value || 0) },
                                item.tipo_reparto === "personalizado",
                              )
                            }
                            disabled={item.tipo_reparto !== "personalizado"}
                            className="h-8 w-full border-b border-transparent bg-transparent px-1 font-label text-sm tabular-nums text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary disabled:opacity-40"
                          />
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.pago_fabiola}
                            onChange={(event) =>
                              actualizarItem(
                                item.id as string,
                                { pago_fabiola: Number(event.target.value || 0) },
                                item.tipo_reparto === "personalizado",
                              )
                            }
                            disabled={item.tipo_reparto !== "personalizado"}
                            className="h-8 w-full border-b border-transparent bg-transparent px-1 font-label text-sm tabular-nums text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary disabled:opacity-40"
                          />
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <div className="min-w-[100px]">
                            <input
                              list={`etiquetas-sugeridas-${item.id}`}
                              value={entradaEtiquetaItem[item.id as string] ?? ""}
                              onChange={(event) =>
                                setEntradaEtiquetaItem((anterior) => ({
                                  ...anterior,
                                  [item.id as string]: event.target.value,
                                }))
                              }
                              onFocus={(event) => event.currentTarget.click()}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  agregarEtiquetaItemPorTexto(item.id as string, entradaEtiquetaItem[item.id as string] ?? "");
                                }
                              }}
                              placeholder="-"
                              className="h-8 w-full border-b border-transparent bg-transparent px-1 font-headline text-sm text-on-surface outline-none transition-all duration-150 placeholder:text-on-surface-variant/40 focus:border-b-primary"
                            />
                            <datalist id={`etiquetas-sugeridas-${item.id}`}>
                              {etiquetas.map((etiqueta) => (
                                <option key={etiqueta.id} value={etiqueta.nombre} />
                              ))}
                            </datalist>
                            <div className="flex flex-wrap gap-0.5">
                              {item.etiquetas_ids.map((etiquetaId) => {
                                const etiqueta = etiquetas.find((actual) => actual.id === etiquetaId);
                                if (!etiqueta) {
                                  return null;
                                }

                                return (
                                  <button
                                    key={etiqueta.id}
                                    type="button"
                                    onClick={() => toggleEtiquetaItem(item.id as string, etiqueta.id)}
                                    className="inline-flex h-5 items-center rounded-full bg-surface-variant px-1.5 font-label text-[10px] font-medium text-on-surface-variant transition-all duration-150 hover:bg-surface-container-high"
                                  >
                                    {etiqueta.nombre} ×
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-outline-variant/10 px-1 py-1">
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => duplicarFila(item.id as string)}
                              className="h-7 w-7 rounded-full px-1.5 font-label text-xs font-medium text-on-surface-variant transition-all duration-150 hover:bg-surface-container-high"
                              title="Duplicar"
                            >
                              ⧉
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarFila(item.id as string)}
                              className="h-7 w-7 rounded-full px-1.5 font-label text-xs font-medium text-on-surface-variant transition-all duration-150 hover:bg-error-container hover:text-error"
                              title="Borrar"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <footer className="sticky bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-[1160px] bg-surface-container-high px-2 py-2 md:fixed md:px-4 md:py-3 md:shadow-card">
        <div className="flex flex-wrap items-center gap-2 md:justify-between md:gap-3">
          <div className="min-w-0">
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total</p>
            <p className="font-label text-2xl font-bold tracking-tight tabular-nums text-primary text-right">{formatearPeso(total)}</p>
          </div>

          <button
            type="button"
            onClick={() => agregarFila()}
            className="h-10 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 font-label text-sm font-medium text-on-surface transition-all duration-150 hover:bg-surface-container-high active:scale-[0.97]"
          >
            + Item
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra(true)}
            disabled={guardandoCompra}
            className="h-10 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-4 font-label text-sm font-medium text-on-surface transition-all duration-150 hover:bg-surface-container-high active:scale-[0.97] disabled:opacity-50"
          >
            Confirmar y nueva
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra(false)}
            disabled={guardandoCompra}
            className="h-10 min-w-[180px] flex-1 rounded-full bg-primary px-4 font-label text-sm font-semibold text-on-primary shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50"
          >
            {guardandoCompra ? "Guardando..." : "Confirmar Compra"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export const FormularioCompra = FormularioCompraUnificado;
