"use client";

import { useMemo } from "react";
import type { Categoria, ItemEditable, Subcategoria } from "@/types";
import { FilaItem } from "@/components/compras/FilaItem";

interface Props {
  items: ItemEditable[];
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  onEditarItem: (id: string) => void;
}

export function TablaItems({ items, categorias, subcategorias, onEditarItem }: Props) {
  const categoriasPorId = useMemo(() => new Map(categorias.map((registro) => [registro.id, registro])), [categorias]);
  const subcategoriasPorId = useMemo(
    () => new Map(subcategorias.map((registro) => [registro.id, registro])),
    [subcategorias],
  );

  return (
    <div className="bg-white border-y border-gray-300 flex flex-col">
      {items.length ? (
        items.map((item, indice) => {
          const itemId = item.id ?? `item-${indice}`;
          const subcategoria = item.subcategoria_id ? subcategoriasPorId.get(item.subcategoria_id) ?? null : null;
          const categoriaPorId = item.categoria_id ? categoriasPorId.get(item.categoria_id) ?? null : null;
          const categoria = categoriaPorId ?? (subcategoria ? categoriasPorId.get(subcategoria.categoria_id) ?? null : null);

          return (
            <FilaItem
              key={itemId}
              item={item}
              categoria={categoria}
              subcategoria={subcategoria}
              onAbrir={() => onEditarItem(itemId)}
            />
          );
        })
      ) : (
        <div className="p-3 border-b border-gray-200 text-sm text-gray-500">No hay items cargados.</div>
      )}
    </div>
  );
}
