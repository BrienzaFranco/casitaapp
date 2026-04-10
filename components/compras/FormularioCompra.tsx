"use client";

import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, PagadorCompra, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { ResumenTotal } from "@/components/compras/ResumenTotal";
import { TablaItems } from "@/components/compras/TablaItems";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  cargandoCategorias?: boolean;
  cargandoSubcategorias?: boolean;
  cargandoEtiquetas?: boolean;
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  guardando?: boolean;
  onCrearBorrador: (
    compra: Pick<CompraEditable, "fecha" | "nombre_lugar" | "notas" | "registrado_por" | "hogar_id" | "pagador_general">,
  ) => Promise<string>;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
  onCrearCategoriaRapida: (nombre: string) => Promise<Categoria>;
}

type PasoFormulario = "base" | "items";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function generarIdTemporal() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tmp-${crypto.randomUUID()}`;
  }

  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function repartoDesdePagador(pagador: PagadorCompra): TipoReparto {
  if (pagador === "franco") {
    return "solo_franco";
  }

  if (pagador === "fabiola") {
    return "solo_fabiola";
  }

  return "50/50";
}

function crearItemVacio(pagadorGeneral: PagadorCompra): ItemEditable {
  const tipoReparto = repartoDesdePagador(pagadorGeneral);
  const repartoInicial = calcularReparto(tipoReparto, 0, 0, 0);

  return {
    id: generarIdTemporal(),
    descripcion: "",
    categoria_id: "",
    subcategoria_id: "",
    expresion_monto: "",
    monto_resuelto: 0,
    tipo_reparto: tipoReparto,
    pago_franco: repartoInicial.pago_franco,
    pago_fabiola: repartoInicial.pago_fabiola,
    etiquetas_ids: [],
  };
}

function normalizarItemsIniciales(items: ItemEditable[]) {
  return items.map((item) => ({
    ...item,
    id: item.id ?? generarIdTemporal(),
  }));
}

function crearCompraInicial(registradoPorDefecto: string, compraInicial?: CompraEditable | null): CompraEditable {
  if (compraInicial) {
    guardarRegistradoPor(compraInicial.registrado_por);
    return {
      ...compraInicial,
      estado: compraInicial.estado ?? "confirmada",
      pagador_general: compraInicial.pagador_general ?? "compartido",
      items: normalizarItemsIniciales(compraInicial.items),
    };
  }

  const registrado_por = obtenerRegistradoPor() || registradoPorDefecto;
  guardarRegistradoPor(registrado_por);

  return {
    fecha: hoy(),
    nombre_lugar: "",
    notas: "",
    registrado_por,
    estado: "borrador",
    pagador_general: "compartido",
    items: [crearItemVacio("compartido")],
  };
}

export function FormularioCompra({
  categorias,
  subcategorias,
  etiquetas,
  cargandoCategorias = false,
  cargandoSubcategorias = false,
  cargandoEtiquetas = false,
  nombres,
  registradoPorDefecto,
  compraInicial,
  guardando = false,
  onCrearBorrador,
  onGuardar,
  onCrearCategoriaRapida,
}: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [paso, setPaso] = useState<PasoFormulario>(compraInicial?.id ? "items" : "base");
  const [idItemConFoco, setIdItemConFoco] = useState<string | null>(compra.items[0]?.id ?? null);
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [creandoBorradorLocal, setCreandoBorradorLocal] = useState(false);

  const guardandoCompra = guardando || guardandoLocal;
  const creandoBorrador = guardando || creandoBorradorLocal;

  useEffect(() => {
    if (!compraInicial && registradoPorDefecto && !compra.registrado_por) {
      setCompra((anterior) => ({
        ...anterior,
        registrado_por: registradoPorDefecto,
      }));
      guardarRegistradoPor(registradoPorDefecto);
    }
  }, [compra.registrado_por, compraInicial, registradoPorDefecto]);

  function actualizarCampo<K extends keyof CompraEditable>(campo: K, valor: CompraEditable[K]) {
    setCompra((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function agregarItem(indiceInsercion?: number) {
    const nuevoItem = crearItemVacio(compra.pagador_general);
    setCompra((anterior) => {
      const items = [...anterior.items];

      if (typeof indiceInsercion === "number") {
        items.splice(indiceInsercion, 0, nuevoItem);
      } else {
        items.push(nuevoItem);
      }

      return {
        ...anterior,
        items,
      };
    });
    setIdItemConFoco(nuevoItem.id ?? null);
  }

  function actualizarItem(id: string, cambios: Partial<ItemEditable>) {
    setCompra((anterior) => ({
      ...anterior,
      items: anterior.items.map((item) => (item.id === id ? { ...item, ...cambios } : item)),
    }));
  }

  function eliminarItem(id: string) {
    setCompra((anterior) => {
      const siguientes = anterior.items.filter((item) => item.id !== id);
      return {
        ...anterior,
        items: siguientes.length ? siguientes : [crearItemVacio(anterior.pagador_general)],
      };
    });
  }

  function reordenarItems(indiceInicial: number, indiceFinal: number) {
    setCompra((anterior) => ({
      ...anterior,
      items: arrayMove(anterior.items, indiceInicial, indiceFinal),
    }));
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

    const filasNormalizadas: ItemEditable[] = [];

    for (const item of filasConContenido) {
      if (!item.expresion_monto.trim()) {
        throw new Error("Cada item con contenido necesita monto.");
      }

      let montoResuelto = 0;
      try {
        montoResuelto = evaluarExpresion(item.expresion_monto);
      } catch {
        throw new Error(`Monto invalido en item: ${item.descripcion || "sin descripcion"}`);
      }

      const reparto = calcularReparto(item.tipo_reparto, montoResuelto, item.pago_franco, item.pago_fabiola);

      filasNormalizadas.push({
        ...item,
        monto_resuelto: montoResuelto,
        pago_franco: reparto.pago_franco,
        pago_fabiola: reparto.pago_fabiola,
      });
    }

    return filasNormalizadas;
  }

  async function crearBorrador() {
    if (compra.id) {
      setPaso("items");
      return;
    }

    try {
      setCreandoBorradorLocal(true);
      const id = await onCrearBorrador({
        fecha: compra.fecha,
        nombre_lugar: compra.nombre_lugar,
        notas: compra.notas,
        registrado_por: compra.registrado_por,
        hogar_id: compra.hogar_id,
        pagador_general: compra.pagador_general,
      });

      setCompra((anterior) => ({
        ...anterior,
        id,
        estado: "borrador",
      }));
      setPaso("items");
      toast.success("Compra creada. Ahora carga los items.");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo crear la compra.";
      toast.error(mensaje);
    } finally {
      setCreandoBorradorLocal(false);
    }
  }

  async function guardarCompra() {
    if (!compra.id) {
      toast.error("Primero crea la compra para cargar items.");
      setPaso("base");
      return;
    }

    try {
      setGuardandoLocal(true);
      const items = normalizarItemsParaGuardar(compra.items);

      if (!items.length) {
        toast.error("Agrega al menos un item antes de confirmar.");
        return;
      }

      await onGuardar({
        ...compra,
        estado: "confirmada",
        items,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar la compra.";
      toast.error(mensaje);
    } finally {
      setGuardandoLocal(false);
    }
  }

  async function crearCategoriaDesdeItem(idItem: string, nombreCategoria: string) {
    const categoria = await onCrearCategoriaRapida(nombreCategoria);
    actualizarItem(idItem, { categoria_id: categoria.id, subcategoria_id: "" });
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaso("base")}
            className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
              paso === "base" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            1. Compra
          </button>
          <button
            type="button"
            onClick={() => {
              if (compra.id) {
                setPaso("items");
              }
            }}
            disabled={!compra.id}
            className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
              paso === "items"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            }`}
          >
            2. Items
          </button>
          {compra.id ? (
            <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
              Borrador activo
            </span>
          ) : null}
        </div>
      </header>

      {paso === "base" ? (
        <section className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-700">Fecha</span>
              <input
                type="date"
                value={compra.fecha}
                onChange={(event) => actualizarCampo("fecha", event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-700">Registrado por</span>
              <input
                type="text"
                value={compra.registrado_por}
                onChange={(event) => {
                  actualizarCampo("registrado_por", event.target.value);
                  guardarRegistradoPor(event.target.value);
                }}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-700">Lugar</span>
            <input
              type="text"
              value={compra.nombre_lugar}
              onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
              placeholder="Ej: Supermercado"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-700">Anotacion</span>
            <textarea
              value={compra.notas}
              onChange={(event) => actualizarCampo("notas", event.target.value)}
              placeholder="Notas de la compra"
              className="min-h-24 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold text-gray-700">Pago general</span>
            <select
              value={compra.pagador_general}
              onChange={(event) => actualizarCampo("pagador_general", event.target.value as PagadorCompra)}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
            >
              <option value="franco">{nombres.franco}</option>
              <option value="fabiola">{nombres.fabiola}</option>
              <option value="compartido">Compartido</option>
            </select>
            <p className="text-xs text-gray-500">Los items nuevos heredan este pagador por defecto.</p>
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void crearBorrador()}
              disabled={creandoBorrador}
              className="h-11 rounded-xl bg-gray-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {compra.id ? "Continuar a items" : creandoBorrador ? "Creando..." : "Crear compra"}
            </button>
          </div>
        </section>
      ) : null}

      {paso === "items" ? (
        <>
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{compra.nombre_lugar || "Compra sin lugar"}</p>
                <p className="text-xs text-gray-500">
                  Pagador general:{" "}
                  {compra.pagador_general === "franco"
                    ? nombres.franco
                    : compra.pagador_general === "fabiola"
                      ? nombres.fabiola
                      : "Compartido"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void guardarCompra()}
                disabled={guardandoCompra}
                className="h-9 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
              >
                {guardandoCompra ? "Confirmando..." : "Confirmar compra"}
              </button>
            </div>
            {cargandoCategorias || cargandoSubcategorias || cargandoEtiquetas ? (
              <p className="mt-2 text-xs text-gray-500">
                Cargando catalogo... puedes escribir descripcion y montos mientras llegan las categorias.
              </p>
            ) : null}
          </div>

          <div className="px-2 py-3 pb-44 sm:px-4">
            <TablaItems
              items={compra.items}
              categorias={categorias}
              subcategorias={subcategorias}
              etiquetas={etiquetas}
              nombres={nombres}
              cargandoCategorias={cargandoCategorias}
              cargandoSubcategorias={cargandoSubcategorias}
              idItemConFoco={idItemConFoco}
              onActualizarItem={actualizarItem}
              onEliminarItem={eliminarItem}
              onAgregarItem={agregarItem}
              onReordenarItems={reordenarItems}
              onCrearCategoriaRapida={crearCategoriaDesdeItem}
            />
          </div>

          <ResumenTotal items={compra.items} nombres={nombres} />
        </>
      ) : null}
    </div>
  );
}
