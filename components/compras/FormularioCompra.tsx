"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { normalizarTexto } from "@/lib/utiles";

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
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
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
      estado: "confirmada",
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
  onCrearSubcategoria,
}: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [mostrarNotas, setMostrarNotas] = useState(Boolean(compraInicial?.notas));
  const [entradaPegado, setEntradaPegado] = useState("");
  const [mostrarPegadoMasivo, setMostrarPegadoMasivo] = useState(false);
  const [entradaEtiquetaCompra, setEntradaEtiquetaCompra] = useState("");
  const [entradaEtiquetaItem, setEntradaEtiquetaItem] = useState<Record<string, string>>({});
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const guardandoCompra = guardando || guardandoLocal;

  const total = useMemo(() => compra.items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0), [compra.items]);

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

    setCompra((anterior) => ({
      ...anterior,
      items: [...anterior.items, recalcularItem(nuevo)],
    }));
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

  async function crearSubcategoriaRapida(itemId: string) {
    if (!onCrearSubcategoria) {
      return;
    }

    const item = compra.items.find((fila) => fila.id === itemId);
    if (!item?.categoria_id) {
      toast.error("Selecciona categoria antes de crear una subcategoria.");
      return;
    }

    const nombre = window.prompt("Nombre de la nueva subcategoria");
    if (!nombre?.trim()) {
      return;
    }

    try {
      const subcategoria = await onCrearSubcategoria({
        categoria_id: item.categoria_id,
        nombre: nombre.trim(),
        limite_mensual: null,
      });

      actualizarItem(itemId, { subcategoria_id: subcategoria.id });
      toast.success("Subcategoria creada.");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo crear la subcategoria.";
      toast.error(mensaje);
    }
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
    "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded bg-gray-100 px-3 text-sm font-medium text-gray-700 border border-gray-200 transition hover:bg-gray-200";
  const botonActivo = "bg-blue-50 text-blue-700 border-blue-300";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-4 md:pb-24">
      <div className="mx-auto w-full max-w-[1160px] px-2 py-2 md:px-3 md:py-3">
        <div className="grid gap-2 md:gap-3 lg:grid-cols-[330px_1fr]">
          <section className="space-y-3">
            <div className="border border-gray-300 bg-white p-2.5 md:p-3">
              <input
                type="text"
                value={compra.nombre_lugar}
                onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
                placeholder="Comercio (ej: Coto)"
                className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-xl font-semibold text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />

              <div className="flex flex-wrap items-center gap-2">
                <label className={botonBase}>
                  Fecha
                  <input
                    type="date"
                    value={compra.fecha}
                    onChange={(event) => actualizarCampo("fecha", event.target.value)}
                    className="border-none bg-transparent p-0 text-sm font-medium text-gray-700 outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "franco")}
                  className={`${botonBase} ${compra.pagador_general === "franco" ? botonActivo : ""}`}
                >
                  {nombres.franco}
                </button>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "fabiola")}
                  className={`${botonBase} ${compra.pagador_general === "fabiola" ? botonActivo : ""}`}
                >
                  {nombres.fabiola}
                </button>
                <button
                  type="button"
                  onClick={() => actualizarCampo("pagador_general", "compartido")}
                  className={`${botonBase} ${compra.pagador_general === "compartido" ? botonActivo : ""}`}
                >
                  Compartido
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarNotas((actual) => !actual)}
                  className={`${botonBase} ${mostrarNotas || compra.notas.trim() ? botonActivo : ""}`}
                >
                  Notas
                </button>
              </div>

              {mostrarNotas ? (
                <textarea
                  value={compra.notas}
                  onChange={(event) => actualizarCampo("notas", event.target.value)}
                  placeholder="Notas libres de la compra"
                  className="mt-3 min-h-24 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              ) : null}

              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-600">Etiquetas de compra</p>
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
                  className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
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
                        className="inline-flex h-7 items-center rounded border border-blue-300 bg-blue-50 px-2 text-xs font-medium text-blue-700"
                        title="Quitar etiqueta"
                      >
                        {etiqueta.nombre} ×
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border border-gray-300 bg-white p-2.5 md:p-3">
              <button
                type="button"
                onClick={() => setMostrarPegadoMasivo((actual) => !actual)}
                className="flex h-9 w-full items-center justify-between rounded border border-gray-300 bg-gray-50 px-3 text-left text-xs font-semibold uppercase text-gray-600 transition hover:bg-gray-100"
              >
                Opciones avanzadas
                <span>{mostrarPegadoMasivo ? "Ocultar" : "Mostrar"}</span>
              </button>
              {mostrarPegadoMasivo ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-600">Pegado masivo</p>
                  <textarea
                    value={entradaPegado}
                    onChange={(event) => setEntradaPegado(event.target.value)}
                    placeholder={`Pega lineas: categoria - subcategoria - detalle - 7600+5200-500\nO columnas desde Sheets (TAB)`}
                    className="min-h-28 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={importarLineasPegadas}
                    className="mt-2 h-9 w-full rounded border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cargar lineas en tabla
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="border border-gray-300 bg-white">
            <div className="flex items-center justify-between border-b border-gray-300 px-3 py-2">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <button
                type="button"
                onClick={() => agregarFila()}
                className="h-8 rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                + Fila
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse md:min-w-[1020px]">
                <thead>
                  <tr className="bg-gray-100 text-left text-xs font-semibold uppercase text-gray-600">
                    <th className="border-b border-gray-300 px-2 py-2">Categoria</th>
                    <th className="border-b border-gray-300 px-2 py-2">Subcategoria</th>
                    <th className="border-b border-gray-300 px-2 py-2">Detalle</th>
                    <th className="border-b border-gray-300 px-2 py-2">Monto</th>
                    <th className="border-b border-gray-300 px-2 py-2">Reparto</th>
                    <th className="border-b border-gray-300 px-2 py-2">Franco</th>
                    <th className="border-b border-gray-300 px-2 py-2">Fabiola</th>
                    <th className="border-b border-gray-300 px-2 py-2">Tags</th>
                    <th className="border-b border-gray-300 px-2 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {compra.items.map((item) => {
                    const subcategoriasFila = item.categoria_id
                      ? opcionesSubcategoriaPorCategoria.get(item.categoria_id) ?? []
                      : [];

                    return (
                      <tr key={item.id} className="align-top text-sm">
                        <td className="border-b border-gray-200 px-2 py-2">
                          <select
                            value={item.categoria_id}
                            onChange={(event) =>
                              actualizarItem(item.id as string, {
                                categoria_id: event.target.value,
                                subcategoria_id: "",
                              })
                            }
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          >
                            <option value="">Sin categoria</option>
                            {categorias.map((categoria) => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.nombre}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <div className="flex items-center gap-1">
                            <select
                              value={item.subcategoria_id}
                              onChange={(event) => actualizarItem(item.id as string, { subcategoria_id: event.target.value })}
                              className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="">Sin subcategoria</option>
                              {subcategoriasFila.map((subcategoria) => (
                                <option key={subcategoria.id} value={subcategoria.id}>
                                  {subcategoria.nombre}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void crearSubcategoriaRapida(item.id as string)}
                              className="inline-flex h-9 shrink-0 items-center justify-center rounded border border-gray-300 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              title="Crear subcategoria"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(event) => actualizarItem(item.id as string, { descripcion: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                agregarFila();
                              }
                            }}
                            placeholder="Yerba playadito a oferta"
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.expresion_monto}
                            onChange={(event) => actualizarItem(item.id as string, { expresion_monto: event.target.value })}
                            onBlur={() => actualizarItem(item.id as string, {}, true)}
                            placeholder="7600+5200-500"
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 font-mono text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          />
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <select
                            value={item.tipo_reparto}
                            onChange={(event) =>
                              actualizarItem(item.id as string, { tipo_reparto: event.target.value as TipoReparto }, true)
                            }
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                          >
                            <option value="50/50">50/50</option>
                            <option value="solo_franco">Solo {nombres.franco}</option>
                            <option value="solo_fabiola">Solo {nombres.fabiola}</option>
                            <option value="personalizado">Personalizado</option>
                          </select>
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
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
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 font-mono text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                          />
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
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
                            className="h-9 w-full rounded border border-gray-300 bg-white px-2 font-mono text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-gray-100"
                          />
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <div className="min-w-[180px] space-y-2">
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
                              placeholder="Etiqueta"
                              className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                            />
                            <datalist id={`etiquetas-sugeridas-${item.id}`}>
                              {etiquetas.map((etiqueta) => (
                                <option key={etiqueta.id} value={etiqueta.nombre} />
                              ))}
                            </datalist>
                            <div className="flex flex-wrap gap-1">
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
                                    className="inline-flex h-7 items-center rounded border border-blue-300 bg-blue-50 px-2 text-[11px] font-medium text-blue-700"
                                  >
                                    {etiqueta.nombre} ×
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-gray-200 px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => duplicarFila(item.id as string)}
                              className="h-9 rounded border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarFila(item.id as string)}
                              className="h-9 rounded border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Borrar
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

      <footer className="sticky bottom-0 left-0 right-0 z-20 mx-auto w-full max-w-[1160px] border-t border-gray-300 bg-gray-100 px-2 py-2 md:fixed md:px-4 md:py-3">
        <div className="flex flex-wrap items-center gap-2 md:justify-between md:gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase text-gray-600">Total</p>
            <p className="text-xl font-mono font-bold text-gray-900">{formatearPeso(total)}</p>
          </div>

          <button
            type="button"
            onClick={() => agregarFila()}
            className="h-10 rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Item
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra(true)}
            disabled={guardandoCompra}
            className="h-10 rounded border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Confirmar y nueva
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra(false)}
            disabled={guardandoCompra}
            className="h-10 min-w-[180px] flex-1 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardandoCompra ? "Guardando..." : "Confirmar Compra"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export const FormularioCompra = FormularioCompraUnificado;
