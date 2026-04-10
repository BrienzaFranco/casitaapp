"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Categoria, Etiqueta, ItemEditable, Subcategoria, TipoReparto } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { formatearPeso } from "@/lib/formatear";
import { ChipMini } from "@/components/ui/ChipMini";

interface Props {
  item: ItemEditable;
  indice: number;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  autoFocusCategoria?: boolean;
  cargandoCategorias?: boolean;
  cargandoSubcategorias?: boolean;
  onActualizar: (id: string, cambios: Partial<ItemEditable>) => void;
  onEliminar: (id: string) => void;
  onAgregarDespues: (indice: number) => void;
  onSolicitarCrearCategoria: (idItem: string) => void;
}

function resolverMonto(item: ItemEditable, expresionMonto: string) {
  if (!expresionMonto.trim()) {
    const reparto = calcularReparto(item.tipo_reparto, 0, item.pago_franco, item.pago_fabiola);
    return {
      monto_resuelto: 0,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
      error: "",
    };
  }

  try {
    const montoResuelto = evaluarExpresion(expresionMonto);
    const reparto = calcularReparto(item.tipo_reparto, montoResuelto, item.pago_franco, item.pago_fabiola);
    return {
      monto_resuelto: montoResuelto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
      error: "",
    };
  } catch {
    return {
      monto_resuelto: 0,
      pago_franco: item.pago_franco,
      pago_fabiola: item.pago_fabiola,
      error: "Expresion invalida",
    };
  }
}

export function FilaItem({
  item,
  indice,
  categorias,
  subcategorias,
  etiquetas,
  nombres,
  autoFocusCategoria = false,
  cargandoCategorias = false,
  cargandoSubcategorias = false,
  onActualizar,
  onEliminar,
  onAgregarDespues,
  onSolicitarCrearCategoria,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id as string,
  });
  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const inputCategoriaRef = useRef<HTMLSelectElement | null>(null);
  const [selectorTagsAbierto, setSelectorTagsAbierto] = useState(false);

  const tiposReparto = useMemo<Array<{ valor: TipoReparto; etiqueta: string }>>(
    () => [
      { valor: "solo_franco", etiqueta: nombres.franco },
      { valor: "solo_fabiola", etiqueta: nombres.fabiola },
      { valor: "50/50", etiqueta: "Compartido" },
      { valor: "personalizado", etiqueta: "Personalizado" },
    ],
    [nombres],
  );
  const subcategoriasFiltradas = useMemo(
    () => subcategorias.filter((subcategoria) => subcategoria.categoria_id === item.categoria_id),
    [subcategorias, item.categoria_id],
  );
  const etiquetasActivas = useMemo(
    () =>
      item.etiquetas_ids
        .map((etiquetaId) => etiquetas.find((etiqueta) => etiqueta.id === etiquetaId))
        .filter((etiqueta): etiqueta is Etiqueta => Boolean(etiqueta)),
    [item.etiquetas_ids, etiquetas],
  );
  const etiquetasVisibles = etiquetasActivas.slice(0, 2);
  const extraEtiquetas = Math.max(0, etiquetasActivas.length - etiquetasVisibles.length);
  const estadoMonto = useMemo(() => resolverMonto(item, item.expresion_monto), [item]);

  useEffect(() => {
    if (autoFocusCategoria) {
      inputCategoriaRef.current?.focus();
    }
  }, [autoFocusCategoria]);

  function actualizarExpresionMonto(expresion_monto: string) {
    const siguienteEstado = resolverMonto(item, expresion_monto);
    onActualizar(item.id as string, {
      expresion_monto,
      monto_resuelto: siguienteEstado.monto_resuelto,
      ...(item.tipo_reparto === "personalizado"
        ? {}
        : {
            pago_franco: siguienteEstado.pago_franco,
            pago_fabiola: siguienteEstado.pago_fabiola,
          }),
    });
  }

  function actualizarTipoReparto(tipo_reparto: TipoReparto) {
    const reparto = calcularReparto(tipo_reparto, item.monto_resuelto, item.pago_franco, item.pago_fabiola);
    onActualizar(item.id as string, {
      tipo_reparto,
      pago_franco: reparto.pago_franco,
      pago_fabiola: reparto.pago_fabiola,
    });
  }

  function alternarEtiqueta(etiquetaId: string) {
    const siguiente = item.etiquetas_ids.includes(etiquetaId)
      ? item.etiquetas_ids.filter((id) => id !== etiquetaId)
      : [...item.etiquetas_ids, etiquetaId];
    onActualizar(item.id as string, { etiquetas_ids: siguiente });
  }

  function manejarEnterUltimoCampo(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onAgregarDespues(indice);
    }
  }

  function manejarCambioCategoria(categoriaId: string) {
    if (categoriaId === "__crear_categoria__") {
      onSolicitarCrearCategoria(item.id as string);
      return;
    }

    onActualizar(item.id as string, { categoria_id: categoriaId, subcategoria_id: "" });
  }

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`group overflow-hidden border-b border-gray-100 px-2 py-2 hover:bg-gray-50 sm:px-3 ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex min-w-0 items-start gap-1 sm:gap-2">
        <div
          {...attributes}
          {...listeners}
          className="w-4 cursor-grab pt-2 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing sm:w-6"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        <select
          ref={inputCategoriaRef}
          value={item.categoria_id}
          onChange={(event) => manejarCambioCategoria(event.target.value)}
          disabled={cargandoCategorias}
          className="h-8 w-[76px] rounded bg-transparent px-1 text-[11px] text-gray-900 outline-none ring-0 focus:ring-1 focus:ring-gray-200 disabled:text-gray-400 sm:w-[104px] sm:px-2 sm:text-xs"
        >
          <option value="">{cargandoCategorias ? "Cargando..." : "Cat"}</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
          <option value="__crear_categoria__">+ Crear</option>
        </select>

        <select
          value={item.subcategoria_id}
          onChange={(event) => onActualizar(item.id as string, { subcategoria_id: event.target.value })}
          disabled={cargandoSubcategorias || !item.categoria_id}
          className="h-8 w-[84px] rounded bg-transparent px-1 text-[11px] text-gray-700 outline-none ring-0 focus:ring-1 focus:ring-gray-200 disabled:text-gray-400 sm:w-[104px] sm:px-2 sm:text-xs"
        >
          <option value="">
            {cargandoSubcategorias ? "Cargando..." : !item.categoria_id ? "Sub" : "Sin sub"}
          </option>
          {subcategoriasFiltradas.map((subcategoria) => (
            <option key={subcategoria.id} value={subcategoria.id}>
              {subcategoria.nombre}
            </option>
          ))}
        </select>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={item.descripcion}
            onChange={(event) => onActualizar(item.id as string, { descripcion: event.target.value })}
            placeholder="Descripcion..."
            className="h-8 w-full rounded border-0 bg-transparent px-1 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200 sm:px-2"
          />
          <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
            {etiquetasVisibles.map((etiqueta) => (
              <ChipMini key={etiqueta.id} label={etiqueta.nombre} color={etiqueta.color} onRemove={() => alternarEtiqueta(etiqueta.id)} />
            ))}
            {extraEtiquetas > 0 ? <span className="text-xs text-gray-500">+{extraEtiquetas}</span> : null}
          </div>
        </div>

        <div className="w-[74px] sm:w-[100px]">
          <input
            type="text"
            inputMode="decimal"
            value={item.expresion_monto}
            onChange={(event) => actualizarExpresionMonto(event.target.value)}
            placeholder="0"
            className={`h-8 w-full rounded border-0 bg-transparent px-1 text-right font-mono text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-200 sm:px-2 sm:text-sm ${
              estadoMonto.error ? "ring-1 ring-red-400 focus:ring-red-400" : ""
            }`}
          />
          <p className={`mt-1 text-right text-xs ${estadoMonto.error ? "text-red-500" : "text-gray-500"}`}>
            {estadoMonto.error ? estadoMonto.error : item.expresion_monto ? `= ${formatearPeso(item.monto_resuelto)}` : ""}
          </p>
        </div>

        <div className="w-[82px] sm:w-[120px]">
          <select
            value={item.tipo_reparto}
            onChange={(event) => actualizarTipoReparto(event.target.value as TipoReparto)}
            onKeyDown={manejarEnterUltimoCampo}
            className="h-7 w-full rounded bg-gray-100 px-1 text-[11px] text-gray-700 outline-none focus:ring-1 focus:ring-gray-200 sm:px-2 sm:text-xs"
          >
            {tiposReparto.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.etiqueta}
              </option>
            ))}
          </select>

          {item.tipo_reparto === "personalizado" ? (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <input
                type="number"
                inputMode="decimal"
                value={item.pago_franco || ""}
                onChange={(event) => onActualizar(item.id as string, { pago_franco: Number(event.target.value || 0) })}
                className="h-7 rounded bg-gray-100 px-1 text-right font-mono text-[10px] text-indigo-600 outline-none focus:ring-1 focus:ring-gray-200 sm:text-xs"
                placeholder="F"
              />
              <input
                type="number"
                inputMode="decimal"
                value={item.pago_fabiola || ""}
                onChange={(event) => onActualizar(item.id as string, { pago_fabiola: Number(event.target.value || 0) })}
                onKeyDown={manejarEnterUltimoCampo}
                className="h-7 rounded bg-gray-100 px-1 text-right font-mono text-[10px] text-emerald-600 outline-none focus:ring-1 focus:ring-gray-200 sm:text-xs"
                placeholder="Fa"
              />
            </div>
          ) : null}
        </div>

        <div className="relative hidden w-[60px] sm:block">
          <div className="flex flex-wrap items-center gap-1">
            {etiquetasVisibles.map((etiqueta) => (
              <ChipMini key={etiqueta.id} label={etiqueta.nombre} color={etiqueta.color} onRemove={() => alternarEtiqueta(etiqueta.id)} />
            ))}
            {extraEtiquetas > 0 ? <span className="text-xs text-gray-500">+{extraEtiquetas}</span> : null}
          </div>
          <button
            type="button"
            onClick={() => setSelectorTagsAbierto((abierto) => !abierto)}
            className="mt-1 h-6 w-full rounded bg-gray-100 text-[10px] font-medium text-gray-500 hover:text-gray-700"
          >
            Tags
          </button>
          {selectorTagsAbierto ? (
            <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              <div className="max-h-40 space-y-1 overflow-auto">
                {etiquetas.map((etiqueta) => {
                  const activa = item.etiquetas_ids.includes(etiqueta.id);
                  return (
                    <button
                      key={etiqueta.id}
                      type="button"
                      onClick={() => alternarEtiqueta(etiqueta.id)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs ${
                        activa ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span>{etiqueta.nombre}</span>
                      {activa ? <Plus className="h-3 w-3 rotate-45 text-gray-500" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onEliminar(item.id as string)}
          className="h-8 w-6 opacity-0 transition group-hover:opacity-100 sm:w-8"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
