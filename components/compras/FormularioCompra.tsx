"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { CompraEditable, ItemEditable } from "@/types";
import type { Categoria, Subcategoria } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { BottomSheetItem } from "@/components/compras/BottomSheetItem";
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

  const registrado_por = obtenerRegistradoPor() || registradoPorDefecto;
  guardarRegistradoPor(registrado_por);

  return {
    fecha: hoy(),
    nombre_lugar: "",
    notas: "",
    registrado_por,
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
  const [sheetAbierto, setSheetAbierto] = useState(false);
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

  function abrirAltaItem() {
    setIdItemEditando(null);
    setSheetAbierto(true);
  }

  function abrirEdicionItem(id: string) {
    setIdItemEditando(id);
    setSheetAbierto(true);
  }

  function cerrarSheet() {
    setSheetAbierto(false);
    setIdItemEditando(null);
  }

  function guardarItem(item: ItemEditable) {
    setCompra((anterior) => {
      const indice = anterior.items.findIndex((actual) => actual.id === item.id);
      if (indice === -1) {
        return {
          ...anterior,
          items: [...anterior.items, item],
        };
      }

      const items = [...anterior.items];
      items[indice] = item;
      return {
        ...anterior,
        items,
      };
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
    cerrarSheet();
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

  const pillBase =
    "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200";
  const pillActiva = "bg-indigo-50 text-indigo-700 border border-indigo-200";

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pb-24 relative">
      <section>
        <input
          type="text"
          value={compra.nombre_lugar}
          onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
          placeholder="Lugar"
          className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder:text-gray-300 px-4 pt-6 pb-2"
        />

        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
          <label className={pillBase}>
            Fecha
            <input
              type="date"
              value={compra.fecha}
              onChange={(event) => actualizarCampo("fecha", event.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 border-none outline-none focus:ring-0 [color-scheme:light]"
            />
          </label>

          <button
            type="button"
            onClick={() => actualizarCampo("pagador_general", "franco")}
            className={`${pillBase} ${compra.pagador_general === "franco" ? pillActiva : ""}`}
          >
            {nombres.franco}
          </button>
          <button
            type="button"
            onClick={() => actualizarCampo("pagador_general", "fabiola")}
            className={`${pillBase} ${compra.pagador_general === "fabiola" ? pillActiva : ""}`}
          >
            {nombres.fabiola}
          </button>
          <button
            type="button"
            onClick={() => actualizarCampo("pagador_general", "compartido")}
            className={`${pillBase} ${compra.pagador_general === "compartido" ? pillActiva : ""}`}
          >
            Compartido
          </button>

          <button
            type="button"
            onClick={() => setMostrarNotas((actual) => !actual)}
            className={`${pillBase} ${mostrarNotas || compra.notas.trim() ? pillActiva : ""}`}
          >
            Notas
          </button>
        </div>

        {mostrarNotas ? (
          <div className="px-4 pb-2">
            <textarea
              value={compra.notas}
              onChange={(event) => actualizarCampo("notas", event.target.value)}
              placeholder="Anotacion de la compra"
              className="w-full min-h-24 resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        ) : null}
      </section>

      <div className="flex-1">
        <TablaItems items={compra.items} categorias={categorias} subcategorias={subcategorias} onEditarItem={abrirEdicionItem} />
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-[480px] border-t border-gray-100 bg-white/90 px-4 py-4 pb-safe backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
            <p className="text-2xl font-mono font-bold text-gray-900 truncate">{formatearPeso(total)}</p>
          </div>

          <button type="button" onClick={abrirAltaItem} className="h-12 w-12 shrink-0 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition" aria-label="Agregar item">
            <Plus className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void confirmarCompra()}
            disabled={guardandoCompra}
            className="flex-1 h-12 rounded-2xl bg-gray-900 text-white font-semibold flex items-center justify-center shadow-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {guardandoCompra ? "Guardando..." : "Confirmar Compra"}
          </button>
        </div>
      </footer>

      <BottomSheetItem
        abierto={sheetAbierto}
        itemInicial={itemEnEdicion}
        categorias={categorias}
        subcategorias={subcategorias}
        pagadorGeneral={compra.pagador_general}
        onGuardar={guardarItem}
        onCerrar={cerrarSheet}
        onEliminar={itemEnEdicion ? eliminarItemEditando : undefined}
      />
    </div>
  );
}

export const FormularioCompra = FormularioCompraUnificado;
