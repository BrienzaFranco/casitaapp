"use client";

import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria } from "@/types";
import { calcularReparto, evaluarExpresion } from "@/lib/calculos";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";
import { ResumenTotal } from "@/components/compras/ResumenTotal";
import { TablaItems } from "@/components/compras/TablaItems";

interface Props {
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
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

function crearItemVacio(): ItemEditable {
  return {
    id: generarIdTemporal(),
    descripcion: "",
    categoria_id: "",
    subcategoria_id: "",
    expresion_monto: "",
    monto_resuelto: 0,
    tipo_reparto: "50/50",
    pago_franco: 0,
    pago_fabiola: 0,
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
    items: [crearItemVacio()],
  };
}

export function FormularioCompra({
  categorias,
  subcategorias,
  etiquetas,
  nombres,
  registradoPorDefecto,
  compraInicial,
  guardando = false,
  onGuardar,
}: Props) {
  const [compra, setCompra] = useState<CompraEditable>(() => crearCompraInicial(registradoPorDefecto, compraInicial));
  const [idItemConFoco, setIdItemConFoco] = useState<string | null>(compra.items[0]?.id ?? null);
  const [guardandoLocal, setGuardandoLocal] = useState(false);

  const guardandoCompra = guardando || guardandoLocal;

  function actualizarCampo<K extends keyof CompraEditable>(campo: K, valor: CompraEditable[K]) {
    setCompra((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function agregarItem(indiceInsercion?: number) {
    const nuevoItem = crearItemVacio();
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
        items: siguientes.length ? siguientes : [crearItemVacio()],
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

  async function guardarCompra() {
    try {
      setGuardandoLocal(true);
      const items = normalizarItemsParaGuardar(compra.items);

      if (!items.length) {
        toast.error("Agrega al menos un item antes de guardar.");
        return;
      }

      await onGuardar({
        ...compra,
        items,
      });

      if (!compraInicial) {
        const registrado_por = compra.registrado_por || registradoPorDefecto;
        const nuevoItem = crearItemVacio();
        setCompra({
          fecha: hoy(),
          nombre_lugar: "",
          notas: "",
          registrado_por,
          items: [nuevoItem],
        });
        setIdItemConFoco(nuevoItem.id ?? null);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar la compra.";
      toast.error(mensaje);
    } finally {
      setGuardandoLocal(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-white">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={compra.fecha}
            onChange={(event) => actualizarCampo("fecha", event.target.value)}
            className="h-9 w-[118px] rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-200 sm:w-auto sm:px-3 sm:text-sm"
          />
          <input
            type="text"
            value={compra.nombre_lugar}
            onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
            placeholder="Lugar..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-200"
          />
          <button
            type="button"
            onClick={() => void guardarCompra()}
            disabled={guardandoCompra}
            className="h-9 rounded-lg bg-gray-900 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
          >
            {guardandoCompra ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </header>

      <div className="px-2 py-3 pb-44 sm:px-4">
        <TablaItems
          items={compra.items}
          categorias={categorias}
          subcategorias={subcategorias}
          etiquetas={etiquetas}
          idItemConFoco={idItemConFoco}
          onActualizarItem={actualizarItem}
          onEliminarItem={eliminarItem}
          onAgregarItem={agregarItem}
          onReordenarItems={reordenarItems}
        />
      </div>

      <ResumenTotal items={compra.items} nombres={nombres} />
    </div>
  );
}
