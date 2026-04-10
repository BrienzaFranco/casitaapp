"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Categoria, CompraEditable, ItemEditable, Subcategoria } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { PanelCargaItem } from "@/components/compras/PanelCargaItem";
import { TablaItems } from "@/components/compras/TablaItems";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  nombres: { franco: string; fabiola: string };
  registradoPorDefecto: string;
  compraInicial?: CompraEditable | null;
  guardando?: boolean;
  onGuardar: (compra: CompraEditable) => Promise<void> | void;
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
      estado: "confirmada",
      pagador_general: compraInicial.pagador_general ?? "compartido",
      items: normalizarItemsIniciales(compraInicial.items),
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
    items: [],
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

export function FormularioCompraUnificado({
  categorias,
  subcategorias,
  nombres,
  registradoPorDefecto,
  compraInicial,
  guardando = false,
  onGuardar,
}: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [idItemEditando, setIdItemEditando] = useState<string | null>(null);
  const [mostrarNotas, setMostrarNotas] = useState(Boolean(compraInicial?.notas));
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const guardandoCompra = guardando || guardandoLocal;

  const itemEnEdicion = useMemo(
    () => (idItemEditando ? compra.items.find((item) => item.id === idItemEditando) ?? null : null),
    [compra.items, idItemEditando],
  );
  const total = useMemo(() => compra.items.reduce((acumulado, item) => acumulado + item.monto_resuelto, 0), [compra.items]);

  useEffect(() => {
    if (!compraInicial && registradoPorDefecto && !compra.registrado_por) {
      setCompra((anterior) => ({ ...anterior, registrado_por: registradoPorDefecto }));
      guardarRegistradoPor(registradoPorDefecto);
    }
  }, [compra.registrado_por, compraInicial, registradoPorDefecto]);

  function actualizarCampo<K extends keyof CompraEditable>(campo: K, valor: CompraEditable[K]) {
    setCompra((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function abrirAltaItem() {
    setIdItemEditando(null);
    setPanelAbierto(true);
  }

  function abrirEdicionItem(id: string) {
    setIdItemEditando(id);
    setPanelAbierto(true);
  }

  function cerrarPanel() {
    setPanelAbierto(false);
    setIdItemEditando(null);
  }

  function guardarItem(item: ItemEditable) {
    setCompra((anterior) => {
      const indice = anterior.items.findIndex((actual) => actual.id === item.id);
      if (indice === -1) {
        return { ...anterior, items: [...anterior.items, item] };
      }

      const items = [...anterior.items];
      items[indice] = item;
      return { ...anterior, items };
    });
  }

  function eliminarItemEditando() {
    if (!idItemEditando) {
      return;
    }

    setCompra((anterior) => ({
      ...anterior,
      items: anterior.items.filter((item) => item.id !== idItemEditando),
    }));
    cerrarPanel();
  }

  async function confirmarCompra() {
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

  const botonBase =
    "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded bg-gray-100 px-3 text-sm font-medium text-gray-700 border border-gray-200 transition hover:bg-gray-200";
  const botonActivo = "bg-blue-50 text-blue-700 border-blue-300";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <section className="bg-white border-b border-gray-300 p-4 mb-4">
        <input
          type="text"
          value={compra.nombre_lugar}
          onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
          placeholder="Lugar"
          className="w-full text-xl font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <label className={botonBase}>
            Fecha
            <input
              type="date"
              value={compra.fecha}
              onChange={(event) => actualizarCampo("fecha", event.target.value)}
              className="bg-transparent border-none p-0 text-sm font-medium text-gray-700 focus:outline-none"
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
            placeholder="Notas"
            className="mt-3 w-full min-h-20 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
          />
        ) : null}
      </section>

      <section className="flex-1">
        <TablaItems
          items={compra.items}
          categorias={categorias}
          subcategorias={subcategorias}
          onEditarItem={abrirEdicionItem}
        />
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-[480px] border-t border-gray-300 bg-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col">
            <p className="text-xs text-gray-600 uppercase">Total</p>
            <p className="text-xl font-mono font-bold text-gray-900">{formatearPeso(total)}</p>
          </div>

          <button
            type="button"
            onClick={abrirAltaItem}
            className="h-10 px-4 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            + Item
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra()}
            disabled={guardandoCompra}
            className="flex-1 h-10 rounded-md bg-blue-600 text-white font-medium flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {guardandoCompra ? "Guardando..." : "Confirmar Compra"}
          </button>
        </div>
      </footer>

      <PanelCargaItem
        abierto={panelAbierto}
        itemInicial={itemEnEdicion}
        categorias={categorias}
        subcategorias={subcategorias}
        pagadorGeneral={compra.pagador_general}
        onGuardar={guardarItem}
        onCerrar={cerrarPanel}
        onEliminar={itemEnEdicion ? eliminarItemEditando : undefined}
      />
    </div>
  );
}

export const FormularioCompra = FormularioCompraUnificado;
