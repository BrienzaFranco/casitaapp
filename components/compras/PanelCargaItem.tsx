"use client";

import { useEffect, useMemo, useState } from "react";
import type { Categoria, ItemEditable, PagadorCompra, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";

interface Props {
  abierto: boolean;
  itemInicial?: ItemEditable | null;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  pagadorGeneral: PagadorCompra;
  onGuardar: (item: ItemEditable) => void;
  onCerrar: () => void;
  onEliminar?: () => void;
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

function crearBaseItem(pagadorGeneral: PagadorCompra): ItemEditable {
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

export function PanelCargaItem({
  abierto,
  itemInicial,
  categorias,
  subcategorias,
  pagadorGeneral,
  onGuardar,
  onCerrar,
  onEliminar,
}: Props) {
  const [draft, setDraft] = useState<ItemEditable>(() => itemInicial ?? crearBaseItem(pagadorGeneral));
  const [errorMonto, setErrorMonto] = useState("");
  const subcategoriasFiltradas = useMemo(
    () => subcategorias.filter((registro) => registro.categoria_id === draft.categoria_id),
    [subcategorias, draft.categoria_id],
  );

  useEffect(() => {
    if (!abierto) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(itemInicial ? { ...itemInicial } : crearBaseItem(pagadorGeneral));
    setErrorMonto("");
  }, [abierto, itemInicial, pagadorGeneral]);

  function actualizar<K extends keyof ItemEditable>(campo: K, valor: ItemEditable[K]) {
    setDraft((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpiarCampos() {
    setDraft(crearBaseItem(pagadorGeneral));
    setErrorMonto("");
  }

  function confirmarItem() {
    const expresion = draft.expresion_monto.trim();
    if (!expresion) {
      setErrorMonto("Ingresa un monto.");
      return;
    }

    let montoResuelto = 0;
    try {
      montoResuelto = evaluarExpresion(expresion);
    } catch {
      setErrorMonto("Monto invalido.");
      return;
    }

    const reparto = calcularReparto(draft.tipo_reparto, montoResuelto, draft.pago_franco, draft.pago_fabiola);
    onGuardar({
      ...draft,
      id: draft.id ?? generarIdTemporal(),
      expresion_monto: expresion,
      monto_resuelto: montoResuelto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
    });

    if (itemInicial) {
      onCerrar();
      return;
    }

    limpiarCampos();
  }

  return (
    <>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar panel"
        className={`fixed inset-0 z-50 bg-gray-900/50 transition-opacity ${
          abierto ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] rounded-t-lg bg-white border-t border-gray-300 transform transition-transform duration-200 ${
          abierto ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <p className="text-sm font-medium text-gray-800">{itemInicial ? "Editar Item" : "Agregar Item"}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-100"
          >
            X
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            inputMode="decimal"
            value={draft.expresion_monto}
            onChange={(event) => {
              actualizar("expresion_monto", event.target.value);
              if (errorMonto) {
                setErrorMonto("");
              }
            }}
            placeholder="0"
            className="w-full text-right text-3xl font-mono text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          {errorMonto ? <p className="-mt-2 mb-3 text-xs text-red-600">{errorMonto}</p> : null}

          <input
            type="text"
            value={draft.descripcion}
            onChange={(event) => actualizar("descripcion", event.target.value)}
            placeholder="Descripcion"
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-4"
          />

          <div className="grid grid-cols-4 gap-2 mb-4 max-h-[30vh] overflow-y-auto">
            {categorias.map((categoria) => {
              const seleccionada = draft.categoria_id === categoria.id;
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() =>
                    setDraft((anterior) => ({
                      ...anterior,
                      categoria_id: categoria.id,
                      subcategoria_id: "",
                    }))
                  }
                  className={`flex flex-col items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer ${
                    seleccionada ? "bg-blue-50 border-blue-300" : ""
                  }`}
                >
                  <div className="h-6 w-6 rounded-sm mb-1" style={{ backgroundColor: categoria.color || "#9ca3af" }} />
                  <span className="text-[10px] text-gray-700 text-center leading-tight line-clamp-2">{categoria.nombre}</span>
                </button>
              );
            })}
          </div>

          {subcategoriasFiltradas.length ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
              {subcategoriasFiltradas.map((subcategoria) => {
                const seleccionada = draft.subcategoria_id === subcategoria.id;
                return (
                  <button
                    key={subcategoria.id}
                    type="button"
                    onClick={() => actualizar("subcategoria_id", subcategoria.id)}
                    className={`inline-flex h-8 items-center gap-2 whitespace-nowrap rounded bg-gray-100 px-3 text-sm font-medium text-gray-700 border border-gray-200 transition hover:bg-gray-200 ${
                      seleccionada ? "bg-blue-50 text-blue-700 border-blue-300" : ""
                    }`}
                  >
                    {subcategoria.nombre}
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={confirmarItem}
            className="w-full h-10 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 transition"
          >
            Guardar Item
          </button>

          {itemInicial && onEliminar ? (
            <button
              type="button"
              onClick={onEliminar}
              className="mt-2 w-full h-10 rounded-md border border-red-300 bg-white text-red-600 font-medium hover:bg-red-50 transition"
            >
              Eliminar Item
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
