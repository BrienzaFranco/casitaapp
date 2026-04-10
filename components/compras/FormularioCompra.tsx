"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import type { Categoria, CompraEditable, Etiqueta, ItemEditable, Subcategoria } from "@/types";
import { FormularioItem } from "@/components/items/FormularioItem";
import { ListaItems } from "@/components/items/ListaItems";
import { Boton } from "@/components/ui/Boton";
import { Input } from "@/components/ui/Input";
import { guardarRegistradoPor, obtenerRegistradoPor } from "@/lib/offline";

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

function crearCompraInicial(registradoPorDefecto: string, compraInicial?: CompraEditable | null): CompraEditable {
  if (compraInicial) {
    return compraInicial;
  }

  return {
    fecha: hoy(),
    nombre_lugar: "",
    notas: "",
    registrado_por: obtenerRegistradoPor() || registradoPorDefecto,
    items: [],
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
  const [indiceEditando, setIndiceEditando] = useState<number | null>(null);
  const [versionItem, setVersionItem] = useState(0);

  function actualizarCampo<K extends keyof CompraEditable>(campo: K, valor: CompraEditable[K]) {
    setCompra((anterior) => {
      const siguiente = {
        ...anterior,
        [campo]: valor,
      };

      if (campo === "registrado_por" && typeof valor === "string") {
        guardarRegistradoPor(valor);
      }

      return siguiente;
    });
  }

  function guardarItem(item: ItemEditable) {
    setCompra((anterior) => {
      const items = [...anterior.items];

      if (indiceEditando !== null) {
        items[indiceEditando] = item;
      } else {
        items.push(item);
      }

      return {
        ...anterior,
        items,
      };
    });

    setIndiceEditando(null);
    setVersionItem((anterior) => anterior + 1);
  }

  async function guardarCompra() {
    if (!compra.items.length) {
      return;
    }

    await onGuardar(compra);

    if (!compraInicial) {
      setCompra(crearCompraInicial(compra.registrado_por));
      setIndiceEditando(null);
      setVersionItem((anterior) => anterior + 1);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Paso 1: encabezado</h2>
          <p className="text-sm text-gray-500">Carga lo minimo y segui con los items.</p>
        </div>

        <div className="space-y-4">
          <Input etiqueta="Fecha" type="date" value={compra.fecha} onChange={(event) => actualizarCampo("fecha", event.target.value)} />
          <Input
            etiqueta="Nombre del lugar"
            value={compra.nombre_lugar}
            onChange={(event) => actualizarCampo("nombre_lugar", event.target.value)}
            placeholder="Ej: Coto Palermo"
          />
          <Input
            etiqueta="Registrado por"
            value={compra.registrado_por}
            onChange={(event) => actualizarCampo("registrado_por", event.target.value)}
            placeholder="Nombre del perfil"
          />
          <label className="flex flex-col gap-2 text-left">
            <span className="text-sm font-semibold text-gray-800">Notas</span>
            <textarea
              className="min-h-24 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={compra.notas}
              onChange={(event) => actualizarCampo("notas", event.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>
      </section>

      <FormularioItem
        key={`${indiceEditando === null ? "nuevo" : indiceEditando}-${versionItem}`}
        categorias={categorias}
        subcategorias={subcategorias}
        etiquetas={etiquetas}
        nombres={nombres}
        itemEditando={indiceEditando !== null ? compra.items[indiceEditando] : null}
        onGuardarItem={guardarItem}
        onCancelarEdicion={() => {
          setIndiceEditando(null);
          setVersionItem((anterior) => anterior + 1);
        }}
      />

      <ListaItems
        items={compra.items}
        categorias={categorias}
        subcategorias={subcategorias}
        etiquetas={etiquetas}
        onEditar={setIndiceEditando}
        onEliminar={(indice) =>
          setCompra((anterior) => ({
            ...anterior,
            items: anterior.items.filter((_, indiceActual) => indiceActual !== indice),
          }))
        }
      />

      <Boton anchoCompleto onClick={guardarCompra} disabled={guardando || !compra.items.length} icono={<Save className="h-4 w-4" />}>
        {guardando ? "Guardando..." : compraInicial ? "Guardar compra" : "Guardar compra"}
      </Boton>
    </div>
  );
}
