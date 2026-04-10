"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Categoria, Etiqueta, ItemEditable, Subcategoria } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Boton } from "@/components/ui/Boton";
import { formatearPeso } from "@/lib/formatear";

interface Props {
  items: ItemEditable[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  etiquetas: Etiqueta[];
  onEditar: (indice: number) => void;
  onEliminar: (indice: number) => void;
}

function nombreCategoria(id: string, categorias: Categoria[]) {
  return categorias.find((categoria) => categoria.id === id)?.nombre ?? "Sin categoria";
}

function nombreSubcategoria(id: string, subcategorias: Subcategoria[]) {
  return subcategorias.find((subcategoria) => subcategoria.id === id)?.nombre ?? "";
}

export function ListaItems({ items, categorias, subcategorias, etiquetas, onEditar, onEliminar }: Props) {
  if (!items.length) {
    return (
      <section className="rounded-[28px] border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        Todavia no agregaste items a la compra.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {items.map((item, indice) => (
        <article key={`${item.descripcion}-${indice}`} className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">{item.descripcion || "Item sin descripcion"}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{nombreCategoria(item.categoria_id, categorias)}</Badge>
                {item.subcategoria_id ? <Badge>{nombreSubcategoria(item.subcategoria_id, subcategorias)}</Badge> : null}
              </div>
            </div>
            <p className="font-mono text-base font-semibold text-gray-900">{formatearPeso(item.monto_resuelto)}</p>
          </div>

          {item.etiquetas_ids.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.etiquetas_ids.map((etiquetaId) => {
                const etiqueta = etiquetas.find((itemEtiqueta) => itemEtiqueta.id === etiquetaId);
                if (!etiqueta) {
                  return null;
                }

                return (
                  <Badge key={etiqueta.id} color={etiqueta.color}>
                    {etiqueta.nombre}
                  </Badge>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Boton variante="secundario" icono={<Pencil className="h-4 w-4" />} onClick={() => onEditar(indice)}>
              Editar
            </Boton>
            <Boton variante="fantasma" icono={<Trash2 className="h-4 w-4" />} onClick={() => onEliminar(indice)}>
              Quitar
            </Boton>
          </div>
        </article>
      ))}
    </section>
  );
}
