"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Categoria, Etiqueta, ItemEditable, Subcategoria } from "@/types";
import { formatearPeso } from "@/lib/formatear";
import { vibrarTactico } from "@/lib/haptics";
import { Badge } from "@/components/ui/Badge";
import { FilaItem } from "@/components/compras/FilaItem";
import { Modal } from "@/components/ui/Modal";

interface Props {
  items: ItemEditable[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  nombres: { franco: string; fabiola: string };
  cargandoCategorias?: boolean;
  cargandoSubcategorias?: boolean;
  idItemConFoco?: string | null;
  onActualizarItem: (id: string, cambios: Partial<ItemEditable>) => void;
  onEliminarItem: (id: string) => void;
  onAgregarItem: (indice?: number) => void;
  onReordenarItems: (indiceInicial: number, indiceFinal: number) => void;
  onCrearCategoriaRapida: (idItem: string, nombre: string) => Promise<void>;
}

interface GrupoCategoria {
  id: string;
  nombre: string;
  color?: string;
  total: number;
  items: ItemEditable[];
}

function obtenerGrupo(item: ItemEditable, categorias: Categoria[]) {
  const categoria = categorias.find((registro) => registro.id === item.categoria_id);
  if (!categoria) {
    return {
      id: "sin-categoria",
      nombre: "Sin categoria",
      color: "#9ca3af",
    };
  }

  return {
    id: categoria.id,
    nombre: categoria.nombre,
    color: categoria.color,
  };
}

export function TablaItems({
  items,
  categorias,
  subcategorias,
  etiquetas,
  nombres,
  cargandoCategorias = false,
  cargandoSubcategorias = false,
  idItemConFoco,
  onActualizarItem,
  onEliminarItem,
  onAgregarItem,
  onReordenarItems,
  onCrearCategoriaRapida,
}: Props) {
  const sensores = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));
  const idsSortables = items.map((item) => item.id as string);
  const grupos = useMemo(() => {
    const agrupados = new Map<string, GrupoCategoria>();

    for (const item of items) {
      const grupo = obtenerGrupo(item, categorias);
      const actual = agrupados.get(grupo.id) ?? {
        id: grupo.id,
        nombre: grupo.nombre,
        color: grupo.color,
        total: 0,
        items: [],
      };

      actual.total += item.monto_resuelto;
      actual.items.push(item);
      agrupados.set(grupo.id, actual);
    }

    return [...agrupados.values()];
  }, [items, categorias]);
  const [gruposColapsados, setGruposColapsados] = useState<Record<string, boolean>>({});
  const [idItemNuevaCategoria, setIdItemNuevaCategoria] = useState<string | null>(null);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);

  function manejarDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const indiceInicial = items.findIndex((item) => item.id === active.id);
    const indiceFinal = items.findIndex((item) => item.id === over.id);

    if (indiceInicial === -1 || indiceFinal === -1) {
      return;
    }

    onReordenarItems(indiceInicial, indiceFinal);
    vibrarTactico(16);
  }

  async function confirmarNuevaCategoria() {
    if (!idItemNuevaCategoria) {
      return;
    }

    const nombre = nombreNuevaCategoria.trim();
    if (!nombre) {
      toast.error("Ingresa un nombre de categoria.");
      return;
    }

    try {
      setCreandoCategoria(true);
      await onCrearCategoriaRapida(idItemNuevaCategoria, nombre);
      setIdItemNuevaCategoria(null);
      setNombreNuevaCategoria("");
      toast.success("Categoria creada");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo crear la categoria.";
      toast.error(mensaje);
    } finally {
      setCreandoCategoria(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white">
        <div className="hidden items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-500 sm:flex">
          <span className="w-6"> </span>
          <span className="w-[90px]">Cat</span>
          <span className="w-[80px]">Sub</span>
          <span className="flex-1">Desc</span>
          <span className="w-[100px] text-right">Monto</span>
          <span className="w-[70px] text-center">Reparto</span>
          <span className="w-[60px] text-center">Tags</span>
          <span className="w-8"> </span>
        </div>

        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={manejarDragEnd}>
          <SortableContext items={idsSortables} strategy={verticalListSortingStrategy}>
            {items.map((item, indice) => (
              <FilaItem
                key={item.id}
                item={item}
                indice={indice}
                categorias={categorias}
                subcategorias={subcategorias}
                etiquetas={etiquetas}
                nombres={nombres}
                autoFocusCategoria={item.id === idItemConFoco}
                cargandoCategorias={cargandoCategorias}
                cargandoSubcategorias={cargandoSubcategorias}
                onActualizar={onActualizarItem}
                onEliminar={onEliminarItem}
                onAgregarDespues={(indiceActual) => onAgregarItem(indiceActual + 1)}
                onSolicitarCrearCategoria={(idItem) => {
                  setIdItemNuevaCategoria(idItem);
                  setNombreNuevaCategoria("");
                }}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="flex items-center gap-2 border-b border-dashed border-gray-200 px-2 py-2 sm:px-3">
          <div className="w-4 sm:w-6" />
          <button
            type="button"
            onClick={() => onAgregarItem()}
            className="flex h-8 flex-1 items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Plus className="h-4 w-4" />
            Agregar item
          </button>
        </div>
      </div>

      <Modal
        abierto={Boolean(idItemNuevaCategoria)}
        titulo="Nueva categoria"
        descripcion="Se crea rapido con nombre y color por defecto."
        confirmacion="Crear"
        cancelacion="Cancelar"
        cargando={creandoCategoria}
        onCancelar={() => {
          setIdItemNuevaCategoria(null);
          setNombreNuevaCategoria("");
        }}
        onConfirmar={() => void confirmarNuevaCategoria()}
      >
        <input
          type="text"
          value={nombreNuevaCategoria}
          onChange={(event) => setNombreNuevaCategoria(event.target.value)}
          placeholder="Ej: Alimentos frescos"
          className="mt-2 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </Modal>

      {grupos.length ? (
        <div className="space-y-2">
          {grupos.map((grupo) => {
            const estaColapsado = gruposColapsados[grupo.id] ?? false;
            return (
              <div key={grupo.id} className="overflow-hidden rounded-lg border border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setGruposColapsados((anterior) => ({
                      ...anterior,
                      [grupo.id]: !estaColapsado,
                    }))
                  }
                  className="flex w-full items-center justify-between bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition ${estaColapsado ? "-rotate-90" : ""}`} />
                    <Badge color={grupo.color}>{grupo.nombre}</Badge>
                    <span className="text-xs text-gray-500">{grupo.items.length} items</span>
                  </div>
                  <span className="text-sm font-mono font-medium text-gray-900">{formatearPeso(grupo.total)}</span>
                </button>

                {!estaColapsado ? (
                  <div className="divide-y divide-gray-100">
                    {grupo.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="truncate text-gray-700">{item.descripcion || "Sin descripcion"}</span>
                        <span className="ml-3 font-mono text-gray-900">{formatearPeso(item.monto_resuelto)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
