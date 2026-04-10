"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import type { Categoria, ItemEditable, PagadorCompra, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";

interface Props {
  abierto: boolean;
  itemInicial?: ItemEditable | null;
  prefill?: { categoria_id: string; subcategoria_id: string } | null;
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

export function BottomSheetItem({
  abierto,
  itemInicial,
  prefill = null,
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

    const base = itemInicial ? { ...itemInicial } : crearBaseItem(pagadorGeneral);
    if (!itemInicial && prefill) {
      base.categoria_id = prefill.categoria_id || "";
      base.subcategoria_id = prefill.subcategoria_id || "";
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(base);
    setErrorMonto("");
  }, [abierto, itemInicial, pagadorGeneral, prefill]);

  function actualizar<K extends keyof ItemEditable>(campo: K, valor: ItemEditable[K]) {
    setDraft((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpiarParaSiguiente() {
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
    const itemFinal: ItemEditable = {
      ...draft,
      id: draft.id ?? generarIdTemporal(),
      expresion_monto: expresion,
      monto_resuelto: montoResuelto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
    };

    onGuardar(itemFinal);

    if (itemInicial) {
      onCerrar();
      return;
    }

    limpiarParaSiguiente();
    onCerrar();
  }

  return (
    <>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar formulario de item"
        className={`fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-sm transition-opacity ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[480px] rounded-t-[32px] bg-white p-6 shadow-2xl transform transition-transform duration-300 ${
          abierto ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-300" />

        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
        >
          <X className="h-4 w-4" />
        </button>

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
          className="w-full text-center text-5xl font-mono font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-200 focus:ring-0 mb-4"
        />
        {errorMonto ? <p className="-mt-2 mb-3 text-center text-xs font-medium text-red-500">{errorMonto}</p> : null}

        <input
          type="text"
          value={draft.descripcion}
          onChange={(event) => actualizar("descripcion", event.target.value)}
          placeholder="Descripcion del item"
          className="w-full h-14 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 mb-6 transition"
        />

        <div className="grid grid-cols-4 gap-y-4 gap-x-2 mb-6 max-h-[30vh] overflow-y-auto scrollbar-hide">
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
                className="flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div
                  className={`h-14 w-14 rounded-[20px] flex items-center justify-center text-white shadow-sm transition transform active:scale-95 ${
                    seleccionada ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white" : ""
                  }`}
                  style={{ backgroundColor: categoria.color || "#6b7280" }}
                >
                  {seleccionada ? <Check className="h-5 w-5" /> : <span className="text-xs font-semibold">{categoria.nombre.slice(0, 2).toUpperCase()}</span>}
                </div>
                <span className="text-[11px] font-medium text-gray-600 text-center leading-tight line-clamp-2">{categoria.nombre}</span>
              </button>
            );
          })}
        </div>

        {subcategoriasFiltradas.length ? (
          <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide">
            {subcategoriasFiltradas.map((subcategoria) => {
              const seleccionada = draft.subcategoria_id === subcategoria.id;
              return (
                <button
                  key={subcategoria.id}
                  type="button"
                  onClick={() => actualizar("subcategoria_id", subcategoria.id)}
                  className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-200 ${
                    seleccionada ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : ""
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
          className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-md hover:bg-indigo-700 active:scale-[0.98] transition"
        >
          {itemInicial ? "Guardar cambios" : "Agregar Item"}
        </button>

        {itemInicial && onEliminar ? (
          <button
            type="button"
            onClick={onEliminar}
            className="mt-3 w-full h-11 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
          >
            Eliminar item
          </button>
        ) : null}
      </div>
    </>
  );
}
